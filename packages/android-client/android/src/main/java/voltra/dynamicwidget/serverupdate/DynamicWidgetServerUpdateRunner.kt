package voltra.dynamicwidget.serverupdate

import android.content.Context
import android.util.Log
import voltra.dynamicwidget.DynamicWidgetPropsPersistence
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.server.ResolvedWidgetServerSettings
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerFetchResult

/**
 * Fetch, parse, trial-render, commit — the four steps ADR 0002 requires of every server-driven
 * widget, with every collaborator injected so the failure table can be tested without a network,
 * a Hermes runtime, or WorkManager.
 *
 * The rule the ordering exists for: props that do not render are never committed. A server that
 * starts returning a shape the widget throws on leaves the last good props on screen instead of
 * replacing them with an error box.
 */
internal class DynamicWidgetServerUpdateRunner(
    private val resolveKind: suspend (String) -> VoltraWidgetKindResolution,
    private val resolveSettings: suspend (WidgetScope) -> ResolvedWidgetServerSettings,
    private val currentRevision: suspend (WidgetScope) -> Long,
    private val readEtag: (WidgetScope, String?) -> String?,
    private val fetch: suspend (WidgetScope, ResolvedWidgetServerSettings, String?) -> WidgetServerFetchResult,
    private val writeEtag: (WidgetScope, String, String?) -> Unit,
    private val trialRender: suspend (WidgetScope, String) -> Boolean,
    private val commitProps: DynamicWidgetPropsPersistence,
    private val statusStore: DynamicWidgetServerStatusSink,
    private val notifyWidget: suspend (WidgetScope) -> Unit,
    private val now: () -> Long = System::currentTimeMillis,
) {
    suspend fun run(scope: WidgetScope): DynamicWidgetServerUpdateOutcome {
        // Kind first, before anything opens a connection (ADR 0000). A release that turns a
        // Dynamic Widget back into a payload widget leaves this work scheduled, and it has to
        // notice rather than write props into a widget that does not read them.
        val kind = resolveKind(scope.widgetId)

        if (kind !is VoltraWidgetKindResolution.Resolved || kind.kind != VoltraWidgetKind.Dynamic) {
            Log.w(TAG, "Widget '${scope.widgetId}' is not a Dynamic Widget; cancelling its server updates")
            return DynamicWidgetServerUpdateOutcome.Skipped
        }

        val settings = resolveSettings(scope)

        if (!settings.shouldFetch) {
            statusStore.markDisabledIfNeeded(scope, settings.enabled)
            return DynamicWidgetServerUpdateOutcome.Skipped
        }

        val revision = currentRevision(scope)
        val url = settings.url!!
        val result = fetch(scope, settings, readEtag(scope, url))

        // Settings that moved while we were on the network make this response answer a question
        // nobody is asking any more.
        if (currentRevision(scope) != revision) {
            Log.d(TAG, "Dropping server update for '${scope.widgetId}': settings changed mid-fetch")
            return DynamicWidgetServerUpdateOutcome.Dropped
        }

        return when (result) {
            is WidgetServerFetchResult.NotModified -> {
                statusStore.recordSuccess(scope, now(), HTTP_NOT_MODIFIED)
                notifyWidget(scope)
                DynamicWidgetServerUpdateOutcome.Committed
            }

            is WidgetServerFetchResult.NetworkFailure -> {
                Log.w(TAG, "Server update for '${scope.widgetId}' failed: ${result.message}")
                statusStore.recordFailure(scope, DynamicWidgetServerStatus.ERROR_NETWORK)
                notifyWidget(scope)
                DynamicWidgetServerUpdateOutcome.Retry
            }

            is WidgetServerFetchResult.HttpFailure -> {
                val error =
                    if (result.isUnauthorized) {
                        DynamicWidgetServerStatus.ERROR_UNAUTHORIZED
                    } else {
                        DynamicWidgetServerStatus.ERROR_HTTP
                    }

                Log.w(TAG, "Server update for '${scope.widgetId}' got HTTP ${result.httpStatus}")
                statusStore.recordFailure(scope, error, result.httpStatus)
                notifyWidget(scope)

                // A 401 will keep being a 401 until the app sets a fresh token, and setting one
                // reloads the widget. Backing off would only burn battery.
                if (result.isTransient) {
                    DynamicWidgetServerUpdateOutcome.Retry
                } else {
                    DynamicWidgetServerUpdateOutcome.Failed
                }
            }

            is WidgetServerFetchResult.Success -> {
                commit(scope, url, result)
            }
        }
    }

    private suspend fun commit(
        scope: WidgetScope,
        url: String,
        result: WidgetServerFetchResult.Success,
    ): DynamicWidgetServerUpdateOutcome {
        when (val parsed = DynamicWidgetServerProps.parse(result.body)) {
            is DynamicWidgetPropsParseResult.Invalid -> {
                Log.e(TAG, "Server update for '${scope.widgetId}' rejected: ${parsed.reason}")
                statusStore.recordFailure(scope, DynamicWidgetServerStatus.ERROR_PARSE, result.httpStatus)
                notifyWidget(scope)
                // Asking again returns the same body, so this is not something to retry.
                return DynamicWidgetServerUpdateOutcome.Failed
            }

            is DynamicWidgetPropsParseResult.Props -> {
                if (!trialRender(scope, parsed.json)) {
                    Log.e(TAG, "Server update for '${scope.widgetId}' did not render; keeping the previous props")
                    statusStore.recordFailure(scope, DynamicWidgetServerStatus.ERROR_RENDER, result.httpStatus)
                    notifyWidget(scope)
                    return DynamicWidgetServerUpdateOutcome.Failed
                }

                commitProps.persistDynamicWidgetProps(scope.widgetId, parsed.json)
                writeEtag(scope, url, result.etag)
                statusStore.recordSuccess(scope, now(), result.httpStatus)
                notifyWidget(scope)

                return DynamicWidgetServerUpdateOutcome.Committed
            }
        }
    }

    private companion object {
        private const val TAG = "VoltraDynamicServerUpdate"
        private const val HTTP_NOT_MODIFIED = 304
    }
}

/** The slice of [DynamicWidgetServerPropsStore] the runner needs, so tests can supply a fake. */
internal interface DynamicWidgetServerStatusSink {
    fun recordSuccess(
        scope: WidgetScope,
        fetchedAt: Long,
        httpStatus: Int,
    )

    fun recordFailure(
        scope: WidgetScope,
        error: String,
        httpStatus: Int? = null,
    )

    /** Reports `disabled` when the app turned fetching off, so the widget can hide its freshness line. */
    fun markDisabledIfNeeded(
        scope: WidgetScope,
        enabled: Boolean,
    )
}
