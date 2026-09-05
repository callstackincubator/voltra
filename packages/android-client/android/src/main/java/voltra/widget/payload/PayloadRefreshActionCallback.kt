package voltra.widget.payload

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import voltra.parsing.VoltraPayloadParser
import voltra.widget.VoltraRefreshActionCallback
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.VoltraWidgetReceivers
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerFetchResult
import voltra.widget.server.WidgetServerFetcher
import voltra.widget.server.WidgetServerRequestBuilder

/**
 * Real implementation behind the pinned [voltra.widget.VoltraRefreshActionCallback] (ADR 0000):
 * fetches fresh widget content from the server, then pushes updated RemoteViews (with the
 * refresh button) directly via AppWidgetManager.
 *
 * We bypass Glance's update()/session mechanism entirely because it doesn't reliably trigger
 * provideGlance() from ActionCallbacks. Instead we use GlanceRemoteViews.compose() (via
 * [RemoteViewsGenerator]) to generate RemoteViews that include both the widget content and the
 * refresh button overlay, then push them directly.
 *
 * The fetch is inline rather than enqueued, so a tap redraws the widget as fast as the network
 * allows and a failed tap simply leaves what is on screen. That is unchanged; what ADR 0002
 * changes is that the request comes from the shared settings resolver, so a runtime URL, method
 * or header applies to the refresh button too.
 */
internal class PayloadRefreshActionCallback {
    companion object {
        // Kept as the original class name (ADR 0000): this TAG predates the package split and is
        // part of existing logcat filters/dashboards.
        private const val TAG = "VoltraRefreshCallback"
    }

    suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val widgetId = parameters[VoltraRefreshActionCallback.KEY_WIDGET_ID]
        if (widgetId == null) {
            Log.e(TAG, "No widget ID in action parameters")
            return
        }

        Log.d(TAG, "Refresh requested for widget '$widgetId'")

        // Resolve the widget's kind before opening any connection (ADR 0000, mirroring
        // VoltraWidgetUpdateWorker): a Dynamic Widget's placeholder reader never consults this
        // payload store, so fetching for the wrong kind is wasted work.
        when (val kindResolution = VoltraWidgetKindResolver.resolve(context, widgetId)) {
            is VoltraWidgetKindResolution.Unresolved -> {
                Log.w(TAG, "Skipping refresh for widget '$widgetId': ${kindResolution.reason}")
                return
            }

            is VoltraWidgetKindResolution.Resolved -> {
                if (kindResolution.kind != VoltraWidgetKind.Payload) {
                    Log.w(
                        TAG,
                        "Skipping refresh for widget '$widgetId': not a payload-driven widget (${kindResolution.kind})",
                    )
                    return
                }
            }
        }

        val scope = WidgetScope.of(widgetId)
        val settings = VoltraWidgetServer.resolver(context).resolve(scope)

        if (!settings.shouldFetch) {
            Log.w(TAG, "No server url for widget '$widgetId', skipping refresh")
            return
        }

        // A tap is an explicit "give me the current data", so the stored ETag is deliberately not
        // sent: a 304 would leave the user staring at an unchanged widget with no way to tell
        // whether the tap did anything.
        val request = WidgetServerRequestBuilder.build(context, scope, settings) ?: return

        val jsonString =
            withContext(Dispatchers.IO) {
                when (val result = WidgetServerFetcher.fetch(request)) {
                    is WidgetServerFetchResult.Success -> {
                        result.body
                    }

                    is WidgetServerFetchResult.HttpFailure -> {
                        Log.e(TAG, "Server returned HTTP ${result.httpStatus} for widget '$widgetId'")
                        null
                    }

                    is WidgetServerFetchResult.NetworkFailure -> {
                        Log.e(TAG, "Refresh failed for widget '$widgetId': ${result.message}")
                        null
                    }

                    is WidgetServerFetchResult.NotModified -> {
                        Log.d(TAG, "Widget '$widgetId' is unchanged")
                        null
                    }
                }
            } ?: return

        val widgetManager = VoltraWidgetManager(context)
        widgetManager.writeWidgetData(widgetId, jsonString, null)
        Log.d(TAG, "Data stored for widget '$widgetId'")

        val payload =
            try {
                VoltraPayloadParser.parse(jsonString)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse widget payload: ${e.message}", e)
                return
            }

        if (payload.variants.isNullOrEmpty()) {
            Log.w(TAG, "No variants in payload for widget '$widgetId'")
            return
        }

        try {
            val sizeMapping =
                RemoteViewsGenerator.generateWidgetRemoteViewsWithRefresh(
                    context,
                    payload,
                    widgetId,
                )

            if (sizeMapping.isEmpty()) {
                Log.w(TAG, "No RemoteViews generated for widget '$widgetId'")
                return
            }

            val componentName = VoltraWidgetReceivers.componentName(context, widgetId)
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            for (appWidgetId in appWidgetIds) {
                appWidgetManager.updateResponsiveAppWidget(appWidgetId, sizeMapping)
                Log.d(TAG, "Pushed RemoteViews to widget instance $appWidgetId")
            }

            Log.d(TAG, "Refresh completed for widget '$widgetId' (${appWidgetIds.size} instances)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate/push RemoteViews for widget '$widgetId': ${e.message}", e)
        }
    }
}
