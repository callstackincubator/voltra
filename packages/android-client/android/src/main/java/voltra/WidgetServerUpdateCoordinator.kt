package voltra

import android.content.Context
import android.util.Log
import voltra.dynamicwidget.serverupdate.DynamicWidgetServerUpdateScheduler
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.payload.VoltraWidgetUpdateScheduler
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerSettingsValidator
import voltra.widget.server.WidgetServerUpdateSettings
import voltra.widget.server.WidgetServerUpdateSettingsJson

/**
 * Applies runtime server-update settings and makes the widgets they affect act on them.
 *
 * Writing a setting is only half of what an app expects from `setWidgetServerUpdate`: a new URL
 * should be fetched from now, a new interval should reschedule the work, and `enabled: false`
 * should actually stop it. Because that means talking to both engines' schedulers, this
 * coordinator lives at `voltra` rather than inside `voltra.widget.server`, which depends on
 * neither engine (ADR 0000).
 */
internal class WidgetServerUpdateCoordinator(
    private val context: Context,
    private val classifyKind: (String) -> VoltraWidgetKind? = { widgetId ->
        when (val resolution = VoltraWidgetKindResolver.resolve(context, widgetId)) {
            is VoltraWidgetKindResolution.Resolved -> resolution.kind
            is VoltraWidgetKindResolution.Unresolved -> null
        }
    },
) {
    sealed class Result {
        object Applied : Result()

        data class Rejected(
            val reason: String,
        ) : Result()
    }

    /**
     * @param widgetId the widget to scope the settings to, or null for every server-driven widget.
     */
    suspend fun set(
        settingsJson: String,
        widgetId: String?,
    ): Result {
        val parsed =
            when (val result = WidgetServerUpdateSettingsJson.parse(settingsJson)) {
                is WidgetServerUpdateSettingsJson.Result.Invalid -> return Result.Rejected(result.reason)
                is WidgetServerUpdateSettingsJson.Result.Parsed -> result.settings
            }

        validate(parsed, widgetId)?.let { return Result.Rejected(it) }

        VoltraWidgetServer.store(context).set(parsed, widgetId?.let { WidgetScope.of(it) })
        applyToAffectedWidgets(widgetId)

        return Result.Applied
    }

    suspend fun clear(widgetId: String?): Result {
        widgetId?.let { id ->
            rejectIfNotServerDriven(id)?.let { return Result.Rejected(it) }
        }

        VoltraWidgetServer.store(context).clear(widgetId?.let { WidgetScope.of(it) })
        applyToAffectedWidgets(widgetId)

        return Result.Applied
    }

    /**
     * Rescheduling and refetching after the deprecated credential API writes its layer. It does not
     * go through [set], but a new token is exactly the thing a widget stuck on a `401` is waiting
     * for.
     */
    suspend fun onCredentialsChanged() {
        VoltraWidgetServer.store(context).bumpRevision()
        applyToAffectedWidgets(widgetId = null)
    }

    /** Drops one widget's runtime settings, for `clearWidget` and `clearAllWidgets`. */
    suspend fun dropWidgetLayer(widgetId: String) {
        if (!VoltraWidgetServer.defaults(context).isServerDriven(widgetId)) return

        VoltraWidgetServer.store(context).clear(WidgetScope.of(widgetId))
    }

    private fun validate(
        settings: WidgetServerUpdateSettings,
        widgetId: String?,
    ): String? {
        widgetId?.let { id ->
            rejectIfNotServerDriven(id)?.let { return it }
        }

        return WidgetServerSettingsValidator.validate(settings, VoltraWidgetServer.isDebugBuild(context))
    }

    /**
     * The engine is chosen at generate time, so a runtime URL cannot turn a locally-driven widget
     * into a server-driven one. Saying so at call time is much easier to act on than a widget that
     * quietly never fetches.
     */
    private fun rejectIfNotServerDriven(widgetId: String): String? {
        if (VoltraWidgetServer.defaults(context).isServerDriven(widgetId)) return null

        return "Widget '$widgetId' is not server-driven. Add a serverUpdate entry for it in app.json " +
            "and rebuild; a runtime url does not change how a widget is rendered."
    }

    /** Reschedules and refetches the widgets a settings change reaches: one, or all of them. */
    private suspend fun applyToAffectedWidgets(widgetId: String?) {
        val affected =
            if (widgetId != null) setOf(widgetId) else VoltraWidgetServer.serverDrivenWidgetIds(context)

        for (id in affected) {
            try {
                applyToWidget(id)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to apply server update settings to '$id': ${e.message}", e)
            }
        }
    }

    private suspend fun applyToWidget(widgetId: String) {
        val scope = WidgetScope.of(widgetId)

        when (classifyKind(widgetId)) {
            VoltraWidgetKind.Dynamic -> {
                DynamicWidgetServerUpdateScheduler.schedule(context, scope)
            }

            VoltraWidgetKind.Payload -> {
                // schedulePeriodicUpdate cancels the work when there is nothing to fetch, so this
                // one call covers a changed interval, a changed url and enabled: false alike.
                VoltraWidgetUpdateScheduler.schedulePeriodicUpdate(context, widgetId)
                VoltraWidgetUpdateScheduler.requestImmediateUpdate(context, widgetId)
            }

            null -> {
                Log.w(TAG, "Could not resolve the kind of '$widgetId'; its settings were stored but not applied")
            }
        }
    }

    private companion object {
        private const val TAG = "VoltraServerSettings"
    }
}
