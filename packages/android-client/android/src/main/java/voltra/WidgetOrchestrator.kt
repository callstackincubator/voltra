package voltra

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import voltra.dynamicwidget.serverupdate.DynamicWidgetServerUpdateScheduler
import voltra.dynamicwidget.triggerDynamicWidgetGlanceUpdate
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.VoltraWidgetReceiver
import voltra.widget.VoltraWidgetReceivers
import voltra.widget.payload.VoltraWidgetManager
import voltra.widget.payload.VoltraWidgetUpdateScheduler
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope

/**
 * Resolves a widget id's [VoltraWidgetKind], or null if it can't be resolved. Injectable so
 * [WidgetOrchestrator]'s classification logic is testable without a real
 * [VoltraWidgetKindResolver] reflection lookup.
 */
internal fun interface WidgetKindClassifier {
    fun classify(widgetId: String): VoltraWidgetKind?
}

/**
 * Ids of every currently-pinned Voltra widget (any kind). Injectable so [WidgetOrchestrator] is
 * testable without a real `AppWidgetManager.installedProviders` lookup.
 */
internal fun interface PinnedWidgetIdsSource {
    fun pinnedWidgetIds(): Set<String>
}

/**
 * Cross-kind widget operations that [VoltraModule] needs but that don't belong to either engine's
 * own manager (ADR 0000). [voltra.widget.payload.VoltraWidgetManager] is payload-only; a Dynamic
 * Widget must never be reached by inferring its id "by subtraction" (pinned ids minus payload ids
 * minus server ids) the way this logic used to. Instead, every installed provider is classified
 * through [widgetKindClassifier] (backed by [VoltraWidgetKindResolver]) before this orchestrator
 * decides how to reload it.
 *
 * [VoltraModule] remains the only class that legitimately touches both kinds directly (ADR 0000);
 * this is the small coordinator it owns for that purpose.
 */
internal class WidgetOrchestrator(
    private val context: Context,
    private val payloadWidgetManager: VoltraWidgetManager = VoltraWidgetManager(context),
    private val widgetKindClassifier: WidgetKindClassifier =
        WidgetKindClassifier { widgetId ->
            when (val resolution = VoltraWidgetKindResolver.resolve(context, widgetId)) {
                is VoltraWidgetKindResolution.Resolved -> resolution.kind
                is VoltraWidgetKindResolution.Unresolved -> null
            }
        },
    private val pinnedWidgetIdsSource: PinnedWidgetIdsSource =
        PinnedWidgetIdsSource { defaultPinnedVoltraWidgetIds(context) },
    // Injectable so tests can observe exactly which ids the classification logic below decided
    // were Dynamic Widgets, without a real registered Glance receiver for the id to update.
    private val dynamicWidgetGlanceUpdateTrigger: suspend (String) -> Unit =
        { dynamicWidgetId -> triggerDynamicWidgetGlanceUpdate(context, dynamicWidgetId) },
    // Injectable for the same reason: a test can observe which Dynamic Widgets were asked to
    // refetch without WorkManager being initialised.
    private val dynamicWidgetServerFetchTrigger: (String) -> Boolean =
        { dynamicWidgetId ->
            if (VoltraWidgetServer.defaults(context).isServerDriven(dynamicWidgetId)) {
                DynamicWidgetServerUpdateScheduler.requestImmediateUpdate(
                    context,
                    WidgetScope.of(dynamicWidgetId),
                )
                true
            } else {
                false
            }
        },
    private val clientWidgetGlanceUpdateTrigger: suspend (String) -> Unit =
        { widgetId -> VoltraWidgetReceiver.triggerGlanceUpdate(context, widgetId) },
) {
    companion object {
        private const val TAG = "WidgetOrchestrator"
    }

    /**
     * Reload specific widgets or all widgets.
     *
     * For server-driven widgets (those with a registered server URL), this enqueues an immediate
     * WorkManager fetch so the widget gets fresh content from the server. For local-only widgets
     * it re-renders from the cached SharedPreferences data. Dynamic Widgets re-run their Glance
     * render directly.
     */
    suspend fun reloadWidgets(widgetIds: List<String>?) =
        withContext(Dispatchers.Main) {
            if (widgetIds != null && widgetIds.isNotEmpty()) {
                Log.d(TAG, "reloadWidgets: specific widgets ${widgetIds.joinToString()}")
                for (widgetId in widgetIds) {
                    try {
                        reloadSingleWidget(widgetId)
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to reload widget $widgetId: ${e.message}")
                    }
                }
            } else {
                Log.d(TAG, "reloadWidgets: all widgets")
                reloadAllWidgets()
            }
        }

    /**
     * Reload a single widget. Dynamic Widgets re-run their Glance render directly; payload-driven
     * widgets enqueue an immediate server fetch if server-driven, otherwise re-render from cache.
     */
    private suspend fun reloadSingleWidget(widgetId: String) {
        if (widgetKindClassifier.classify(widgetId) == VoltraWidgetKind.Dynamic) {
            reloadDynamicWidget(widgetId)
            return
        }

        val didEnqueue = VoltraWidgetUpdateScheduler.requestImmediateUpdate(context, widgetId)
        if (didEnqueue) {
            Log.d(TAG, "reloadSingleWidget: enqueued immediate server fetch for $widgetId")
        } else {
            Log.d(TAG, "reloadSingleWidget: no server URL for $widgetId, updating from cache")
            payloadWidgetManager.updateWidget(widgetId)
        }
    }

    /** Reload all widgets: every cached/server-driven payload widget, plus every Dynamic Widget. */
    suspend fun reloadAllWidgets() {
        // Classification does reflection/PackageManager lookups (via the resolver), so it runs off
        // Main; only the Glance update() calls below need the Main dispatcher.
        val (payloadIds, dynamicIds) =
            withContext(Dispatchers.Default) {
                val cachedPayloadIds = payloadWidgetManager.cachedWidgetIds()
                val cachedAndServerIds =
                    cachedPayloadIds + VoltraWidgetUpdateScheduler.getAllServerDrivenWidgetIds(context)

                val payloadIds = mutableSetOf<String>()
                val dynamicIds = mutableSetOf<String>()

                // Every candidate id (cached/server-driven or merely pinned) is classified through
                // the resolver before deciding how to reload it - never assumed payload-driven or
                // Dynamic by which set it came from (ADR 0000). A cached/server-driven id that the
                // resolver still can't classify keeps the previous payload-path behaviour, so a
                // resolver hiccup doesn't stop server refresh; a pinned-only id that can't be
                // classified is skipped, as before.
                for (widgetId in cachedAndServerIds) {
                    when (widgetKindClassifier.classify(widgetId)) {
                        VoltraWidgetKind.Dynamic -> {
                            // Server-driven Dynamic Widgets are in this set too, and they have no
                            // cached payload; only a widget that actually has one is worth warning
                            // about, because that payload was left by an older app version.
                            if (widgetId in cachedPayloadIds) {
                                Log.w(
                                    TAG,
                                    "reloadAllWidgets: $widgetId has a cached payload but resolves as " +
                                        "a Dynamic Widget; purging the stale payload instead of " +
                                        "pushing it onto the widget",
                                )
                                payloadWidgetManager.clearWidgetData(widgetId)
                            }
                            dynamicIds.add(widgetId)
                        }

                        VoltraWidgetKind.Payload -> {
                            payloadIds.add(widgetId)
                        }

                        null -> {
                            Log.w(
                                TAG,
                                "reloadAllWidgets: could not resolve kind for cached/server-driven " +
                                    "widget $widgetId, defaulting to payload reload",
                            )
                            payloadIds.add(widgetId)
                        }
                    }
                }

                for (widgetId in pinnedWidgetIdsSource.pinnedWidgetIds()) {
                    if (widgetId in payloadIds || widgetId in dynamicIds) continue
                    when (widgetKindClassifier.classify(widgetId)) {
                        VoltraWidgetKind.Dynamic -> {
                            dynamicIds.add(widgetId)
                        }

                        VoltraWidgetKind.Payload -> {
                            payloadIds.add(widgetId)
                        }

                        null -> {
                            Log.w(TAG, "reloadAllWidgets: could not resolve kind for pinned widget $widgetId, skipping")
                        }
                    }
                }

                payloadIds to dynamicIds
            }

        withContext(Dispatchers.Main) {
            Log.d(TAG, "reloadAllWidgets")
            Log.d(
                TAG,
                "Found ${payloadIds.size + dynamicIds.size} widgets to reload " +
                    "(${payloadIds.size} cached/server-driven, ${dynamicIds.size} Dynamic Widgets)",
            )

            for (widgetId in payloadIds) {
                try {
                    reloadSingleWidget(widgetId)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to update widget $widgetId: ${e.message}")
                }
            }
            for (widgetId in dynamicIds) {
                try {
                    reloadDynamicWidget(widgetId)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to update client widget $widgetId: ${e.message}")
                }
            }
        }
    }

    /**
     * Re-renders a Dynamic Widget, and refetches first when it is server-driven.
     *
     * A reload means "show me the current state", and for a server-driven widget that includes
     * asking the server. The render still happens straight away so the widget reflects whatever it
     * already has rather than waiting for the network.
     */
    private suspend fun reloadDynamicWidget(widgetId: String) {
        dynamicWidgetServerFetchTrigger(widgetId)
        dynamicWidgetGlanceUpdateTrigger(widgetId)
    }

    /**
     * Re-render only Dynamic Widgets. Used to react to environment changes that affect `env` but
     * not server payloads, e.g. a light/dark (color scheme) toggle.
     */
    suspend fun reloadClientWidgets() {
        // Classification does reflection/PackageManager lookups (via the resolver), so it runs off
        // Main; only the Glance update() calls below need the Main dispatcher.
        val clientIds =
            withContext(Dispatchers.Default) {
                pinnedWidgetIdsSource
                    .pinnedWidgetIds()
                    .filter { widgetKindClassifier.classify(it) == VoltraWidgetKind.Dynamic }
            }

        withContext(Dispatchers.Main) {
            Log.d(TAG, "reloadClientWidgets: ${clientIds.size} client widget(s)")
            for (widgetId in clientIds) {
                try {
                    clientWidgetGlanceUpdateTrigger(widgetId)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to reload client widget $widgetId: ${e.message}")
                }
            }
        }
    }
}

/**
 * Widget ids of all currently-pinned Voltra widgets, derived from bound AppWidget providers named
 * `<pkg>.widget.VoltraWidget_<id>Receiver`. Covers Dynamic Widgets, which keep no cached prefs
 * data, so [WidgetOrchestrator.reloadAllWidgets] reaches them too. The default
 * [PinnedWidgetIdsSource] backing [WidgetOrchestrator].
 */
private fun defaultPinnedVoltraWidgetIds(context: Context): Set<String> {
    val appWidgetManager = AppWidgetManager.getInstance(context)
    val ids = mutableSetOf<String>()
    try {
        for ((widgetId, componentName) in VoltraWidgetReceivers.installedReceivers(context)) {
            if (appWidgetManager.getAppWidgetIds(componentName).isEmpty()) continue // not pinned
            ids.add(widgetId)
        }
    } catch (e: Exception) {
        Log.e("WidgetOrchestrator", "pinnedVoltraWidgetIds failed: ${e.message}")
    }
    return ids
}
