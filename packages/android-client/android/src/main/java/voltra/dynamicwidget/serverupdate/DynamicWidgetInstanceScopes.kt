package voltra.dynamicwidget.serverupdate

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import voltra.dynamicwidget.VoltraConfigurationStore
import voltra.widget.VoltraWidgetReceivers
import voltra.widget.server.WidgetScope

/**
 * Derives, from a Dynamic Widget's placements, the set of [WidgetScope]s server updates must be
 * scheduled for (ADR 0007).
 *
 * Enumerate the widget's `appWidgetId`s, compute each one's merged configuration
 * ([VoltraConfigurationStore.get]) and key, and take the distinct keys — two placements with the
 * same configuration can only want the same data, so they collapse onto one scope. A widget with no
 * configuration parameters at all always resolves every placement to [WidgetScope.Widget], the
 * single pre-ADR-0007 scope.
 */
internal object DynamicWidgetInstanceScopes {
    private const val TAG = "VoltraDynamicInstScopes"

    /** One scope per distinct configuration among the widget's current placements. */
    suspend fun scopes(
        context: Context,
        widgetId: String,
    ): Set<WidgetScope> = resolve(context, widgetId).map { it.scope }.toSet()

    /**
     * The merged configuration for one already-known [key] of [widgetId], read off whichever
     * placement currently has it — every placement with that key has, by construction, the same
     * configuration. Null when no current placement has that key (it was deleted, or reconfigured,
     * between scheduling and running).
     */
    suspend fun configurationForKey(
        context: Context,
        widgetId: String,
        key: String?,
    ): Map<String, String> {
        if (key == null) return VoltraConfigurationStore(context).get(widgetId)

        return resolve(context, widgetId)
            .firstOrNull { (it.scope as? WidgetScope.Instance)?.key == key }
            ?.configuration
            ?: emptyMap()
    }

    private data class Placement(
        val appWidgetId: Int,
        val configuration: Map<String, String>,
        val scope: WidgetScope,
    )

    private suspend fun resolve(
        context: Context,
        widgetId: String,
    ): List<Placement> {
        val appWidgetIds =
            try {
                val component = VoltraWidgetReceivers.componentName(context, widgetId)
                AppWidgetManager.getInstance(context).getAppWidgetIds(component).toList()
            } catch (e: Exception) {
                Log.w(TAG, "Could not enumerate placements for '$widgetId': ${e.message}")
                emptyList()
            }

        val store = VoltraConfigurationStore(context)

        return appWidgetIds.map { appWidgetId ->
            val configuration = store.get(widgetId, appWidgetId)
            Placement(appWidgetId, configuration, WidgetScope.of(widgetId, configuration))
        }
    }
}
