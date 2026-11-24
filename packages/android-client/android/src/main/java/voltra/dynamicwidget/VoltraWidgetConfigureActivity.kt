package voltra.dynamicwidget

import android.app.Activity
import android.app.AlertDialog
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import voltra.dynamicwidget.serverupdate.DynamicWidgetServerUpdateScheduler
import voltra.widget.VoltraWidgetReceivers

/**
 * What Android opens when a widget with a `dynamicOptions` parameter is added, and from long-press
 * Reconfigure on Android 12+: lists the choices `setWidgetParameterOptions` stored, and saves the
 * pick as that placement's own configuration. The config plugin declares it.
 */
class VoltraWidgetConfigureActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        // Leaving without a pick keeps the placement on the first choice, so every way out is OK.
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))

        val widgetId =
            AppWidgetManager
                .getInstance(this)
                .getAppWidgetInfo(appWidgetId)
                ?.provider
                ?.className
                ?.let(VoltraWidgetReceivers::widgetIdOrNull)
        if (widgetId == null) {
            finish()
            return
        }

        val store = VoltraConfigurationStore(this)
        val (parameter, choices) =
            runBlocking { store.options(widgetId) }.entries.firstOrNull()?.toPair()
                ?: (null to emptyList())
        val title =
            parameter?.let { parameterTitle(widgetId, it) } ?: applicationInfo.loadLabel(packageManager).toString()
        var picked: String? = null

        val night =
            resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        val dialog =
            AlertDialog
                .Builder(
                    this,
                    if (night) {
                        android.R.style.Theme_DeviceDefault_Dialog_Alert
                    } else {
                        android.R.style.Theme_DeviceDefault_Light_Dialog_Alert
                    },
                ).setTitle(title)
                .setOnDismissListener { saveAndFinish(widgetId, appWidgetId, parameter, picked) }
        if (choices.isEmpty()) {
            dialog.setMessage("No $title to choose from yet. Open the app to add one.")
        } else {
            val current = runBlocking { store.get(widgetId, appWidgetId) }[parameter]
            dialog.setSingleChoiceItems(
                choices.map { it.second }.toTypedArray(),
                choices.indexOfFirst {
                    it.first ==
                        current
                },
            ) { shown, which ->
                picked = choices[which].first
                shown.dismiss()
            }
        }
        dialog.show()
    }

    private fun saveAndFinish(
        widgetId: String,
        appWidgetId: Int,
        parameter: String?,
        value: String?,
    ) {
        if (parameter != null && value != null) {
            runBlocking {
                VoltraConfigurationStore(this@VoltraWidgetConfigureActivity).setInstanceValues(
                    widgetId,
                    appWidgetId,
                    mapOf(parameter to value),
                )
            }
        }
        // Before Android 12 the launcher waits for this screen and sends no update of its own.
        val context = applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            try {
                DynamicWidgetServerUpdateScheduler.recompute(context, widgetId)
                triggerDynamicWidgetInstanceConfigurationGlanceUpdate(context, widgetId, appWidgetId)
            } catch (e: Throwable) {
                Log.w(TAG, "Could not redraw '$widgetId' instance $appWidgetId: ${e.message}")
            }
        }
        finish()
    }

    // The title the config plugin writes for the parameter, named as in `androidWidgetResourceId`.
    private fun parameterTitle(
        widgetId: String,
        parameter: String,
    ): String? {
        fun part(value: String) = value.lowercase().replace(Regex("[^a-z0-9_]"), "_")
        val id =
            resources.getIdentifier(
                "voltra_widget_${part(widgetId)}_param_${part(parameter)}_title",
                "string",
                packageName,
            )
        return if (id == 0) null else getString(id)
    }

    private companion object {
        private const val TAG = "VoltraWidgetConfigure"
    }
}
