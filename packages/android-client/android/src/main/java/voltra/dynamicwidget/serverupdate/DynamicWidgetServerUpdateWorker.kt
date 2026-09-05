package voltra.dynamicwidget.serverupdate

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import voltra.dynamicwidget.DynamicWidgetPropsStore
import voltra.dynamicwidget.triggerDynamicWidgetGlanceUpdate
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerEtagStore
import voltra.widget.server.WidgetServerFetchResult
import voltra.widget.server.WidgetServerFetcher
import voltra.widget.server.WidgetServerRequestBuilder

/**
 * Fetches props for one server-driven Dynamic Widget in the background.
 *
 * It never pushes `RemoteViews`. Drawing stays where it already is, in `VoltraClientGlanceWidget`:
 * this worker only commits props and asks Glance to re-render, so a widget looks the same whether
 * its props arrived from the server or from `updateDynamicWidget`.
 */
class DynamicWidgetServerUpdateWorker(
    context: Context,
    parameters: WorkerParameters,
) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result {
        val widgetId =
            inputData.getString(DynamicWidgetServerUpdateScheduler.KEY_WIDGET_ID)
                ?: return Result.failure()

        val scope = WidgetScope.of(widgetId)
        val result = runner(applicationContext).run(scope)

        return when (result.outcome) {
            DynamicWidgetServerUpdateOutcome.Committed -> {
                // Cache-Control: max-age moves the next fetch. Rescheduling the periodic work is
                // how that reaches WorkManager; the UPDATE policy keeps the same unique work.
                result.nextIntervalMinutes?.let { minutes ->
                    DynamicWidgetServerUpdateScheduler.reschedule(applicationContext, scope, minutes)
                }
                Result.success()
            }

            DynamicWidgetServerUpdateOutcome.Dropped -> {
                Result.success()
            }

            // The server answered with something no retry will change: a body that is not props,
            // an oversized one, or a 4xx. The periodic run continues at the normal interval, so
            // this run reports success rather than spending the chain's retry budget.
            DynamicWidgetServerUpdateOutcome.Failed -> {
                Result.success()
            }

            DynamicWidgetServerUpdateOutcome.Retry -> {
                // Retry-After on a 429 or 503 is longer than WorkManager's backoff would be, so it
                // is honoured with an explicitly delayed run instead of the default 30s chain.
                val retryAfterMinutes = result.nextIntervalMinutes

                if (retryAfterMinutes != null) {
                    DynamicWidgetServerUpdateScheduler.requestDelayedUpdate(
                        applicationContext,
                        scope,
                        retryAfterMinutes,
                    )
                    Result.success()
                } else {
                    Result.retry()
                }
            }

            DynamicWidgetServerUpdateOutcome.Skipped -> {
                // Either the widget has nothing to fetch, or it is no longer a Dynamic Widget.
                // Cancelling here is how work left behind by an older release stops itself.
                DynamicWidgetServerUpdateScheduler.cancel(applicationContext, scope)
                Result.success()
            }
        }
    }

    private fun runner(context: Context): DynamicWidgetServerUpdateRunner {
        val resolver = VoltraWidgetServer.resolver(context)
        val etags = WidgetServerEtagStore(context)
        val statuses = DynamicWidgetServerPropsStore(context)

        return DynamicWidgetServerUpdateRunner(
            resolveKind = { id -> VoltraWidgetKindResolver.resolve(context, id) },
            resolveSettings = { resolver.resolve(it) },
            currentRevision = { resolver.revision(it) },
            readEtag = { widgetScope, url -> etags.etag(widgetScope, url) },
            fetch = { widgetScope, settings, etag ->
                withContext(Dispatchers.IO) {
                    val request = WidgetServerRequestBuilder.build(context, widgetScope, settings, etag)

                    if (request == null) {
                        // The runner checks shouldFetch before calling, so this only happens if the
                        // two ever disagree. Reporting it as a network failure keeps the previous
                        // props on screen and retries rather than committing anything.
                        WidgetServerFetchResult.NetworkFailure("Could not build a request")
                    } else {
                        WidgetServerFetcher.fetch(request)
                    }
                }
            },
            writeEtag = { widgetScope, url, etag -> etags.put(widgetScope, url, etag) },
            trialRender = { widgetScope, props -> DynamicWidgetTrialRender.canRender(context, widgetScope, props) },
            commitProps = DynamicWidgetPropsStore(context),
            statusStore = statuses,
            notifyWidget = { widgetScope ->
                try {
                    triggerDynamicWidgetGlanceUpdate(context, widgetScope.widgetId)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to refresh '${widgetScope.widgetId}' after a server update: ${e.message}")
                }
            },
        )
    }

    private companion object {
        private const val TAG = "VoltraDynamicServerWorker"
    }
}
