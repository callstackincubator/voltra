package voltra.widget.payload

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import androidx.work.Data
import androidx.work.ListenableWorker.Result
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import voltra.parsing.VoltraPayloadParser
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.VoltraWidgetReceivers
import voltra.widget.VoltraWidgetUpdateWorker
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerFetchResult
import voltra.widget.server.WidgetServerFetcher
import voltra.widget.server.WidgetServerRequestBuilder

/**
 * Fetches a Voltra payload from the server, stores it, and pushes fresh `RemoteViews` through
 * AppWidgetManager. Split out so the pinned worker class stays a thin delegate, and this
 * payload-only logic can live in `voltra.widget.payload` with the rest of the payload engine.
 *
 * Since ADR 0002 the request itself is built by `voltra.widget.server`, the same code the Dynamic
 * engine uses. With no runtime settings set, that produces the request this worker always sent,
 * plus `locale` and a conditional `If-None-Match`; with settings set, this widget gains the
 * runtime URL, method, headers, query and body too. What it does with the response is unchanged.
 */
internal object PayloadWidgetUpdateWorker {
    // Kept as the original class name (ADR 0000): this TAG predates the package split and is
    // part of existing logcat filters/dashboards.
    private const val TAG = "VoltraWidgetUpdateWorker"

    suspend fun performUpdate(
        applicationContext: Context,
        inputData: Data,
        runAttemptCount: Int,
    ): Result =
        withContext(Dispatchers.IO) {
            val widgetId = inputData.getString(VoltraWidgetUpdateWorker.KEY_WIDGET_ID)

            if (widgetId == null) {
                Log.e(TAG, "Missing required input data: widgetId")
                return@withContext Result.failure()
            }

            val scope = WidgetScope.of(widgetId)

            // Resolve the widget's kind before opening any connection (ADR 0000): a Dynamic
            // Widget's placeholder reader never consults this payload store, so fetching for the
            // wrong kind is wasted work, and neither an unresolved id nor a kind mismatch should
            // fail the periodic chain -- there is nothing to retry.
            when (val kindResolution = VoltraWidgetKindResolver.resolve(applicationContext, widgetId)) {
                is VoltraWidgetKindResolution.Unresolved -> {
                    Log.w(TAG, "Skipping server update for widget '$widgetId': ${kindResolution.reason}")
                    return@withContext Result.success()
                }

                is VoltraWidgetKindResolution.Resolved -> {
                    if (kindResolution.kind != VoltraWidgetKind.Payload) {
                        Log.w(
                            TAG,
                            "Skipping server update for widget '$widgetId': not a payload-driven widget " +
                                "(${kindResolution.kind}). Cancelling its periodic update.",
                        )
                        VoltraWidgetUpdateScheduler.cancelPeriodicUpdate(applicationContext, widgetId)
                        return@withContext Result.success()
                    }
                }
            }

            val resolver = VoltraWidgetServer.resolver(applicationContext)
            val settings = resolver.resolve(scope)

            if (!settings.shouldFetch) {
                Log.d(TAG, "Nothing to fetch for widget '$widgetId': no url, or fetching is disabled")
                return@withContext Result.success()
            }

            val revision = resolver.revision(scope)
            val url = settings.url!!

            Log.d(TAG, "Starting server update for widget '$widgetId' from $url")

            // No If-None-Match: a payload widget sends the request it always sent, plus locale. A
            // 304 would mean committing nothing, and the payload store is cleared by clearWidget
            // and by an app upgrade, so there is no way to be sure "unchanged" still matches what
            // is on screen.
            val request =
                WidgetServerRequestBuilder.build(applicationContext, scope, settings)
                    ?: return@withContext Result.success()

            when (val result = WidgetServerFetcher.fetch(request)) {
                is WidgetServerFetchResult.NotModified -> {
                    // Only reachable if the server answers 304 unprompted; nothing was requested
                    // conditionally, so there is nothing to commit.
                    Log.d(TAG, "Widget '$widgetId' is unchanged since the last fetch")
                    Result.success()
                }

                is WidgetServerFetchResult.TooLarge -> {
                    Log.e(TAG, "Response for widget '$widgetId' is too large to render")
                    Result.failure()
                }

                is WidgetServerFetchResult.NetworkFailure -> {
                    Log.e(
                        TAG,
                        "Server update failed for widget '$widgetId' (attempt $runAttemptCount): ${result.message}",
                    )
                    retryOrGiveUp(widgetId, runAttemptCount)
                }

                is WidgetServerFetchResult.HttpFailure -> {
                    Log.e(
                        TAG,
                        "Server returned HTTP ${result.httpStatus} for widget '$widgetId' (attempt $runAttemptCount)",
                    )

                    // A 4xx that is not a 429 will not change by asking again, so it is not worth
                    // the retry budget; the next periodic run tries at the normal interval.
                    if (result.isTransient) retryOrGiveUp(widgetId, runAttemptCount) else Result.failure()
                }

                is WidgetServerFetchResult.Success -> {
                    if (resolver.revision(scope) != revision) {
                        Log.d(TAG, "Dropping server update for '$widgetId': settings changed mid-fetch")
                        return@withContext Result.success()
                    }

                    commit(applicationContext, widgetId, result.body)
                    Result.success()
                }
            }
        }

    /**
     * Stores the payload first, then tries to draw it. Storing first is deliberate: Glance reads
     * the stored payload on its own, so a payload that parses but fails to draw here is still the
     * widget's content rather than being thrown away.
     */
    private suspend fun commit(
        applicationContext: Context,
        widgetId: String,
        body: String,
    ) {
        Log.d(TAG, "Received ${body.length} bytes for widget '$widgetId'")

        VoltraWidgetManager(applicationContext).writeWidgetData(widgetId, body, null)

        val payload =
            try {
                VoltraPayloadParser.parse(body)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse widget payload: ${e.message}", e)
                return
            }

        if (payload.variants.isNullOrEmpty()) {
            Log.w(TAG, "No variants in payload for widget '$widgetId'")
            return
        }

        val sizeMapping =
            if (VoltraWidgetUpdateScheduler.isRefreshEnabled(applicationContext, widgetId)) {
                RemoteViewsGenerator.generateWidgetRemoteViewsWithRefresh(applicationContext, payload, widgetId)
            } else {
                RemoteViewsGenerator.generateWidgetRemoteViews(applicationContext, payload)
            }

        val componentName = VoltraWidgetReceivers.componentName(applicationContext, widgetId)
        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        if (appWidgetIds.isEmpty()) {
            Log.w(TAG, "No widget instances found on home screen for '$widgetId'")
            return
        }

        if (sizeMapping.isEmpty()) {
            return
        }

        for (appWidgetId in appWidgetIds) {
            appWidgetManager.updateResponsiveAppWidget(appWidgetId, sizeMapping)
            Log.d(TAG, "Updated widget instance $appWidgetId with server data")
        }

        Log.d(TAG, "Server update completed successfully for widget '$widgetId'")
    }

    private fun retryOrGiveUp(
        widgetId: String,
        runAttemptCount: Int,
    ): Result =
        if (runAttemptCount >= VoltraWidgetUpdateWorker.MAX_RETRIES) {
            Log.w(
                TAG,
                "Max retries (${VoltraWidgetUpdateWorker.MAX_RETRIES}) reached for widget '$widgetId', giving up",
            )
            Result.failure()
        } else {
            Result.retry()
        }
}
