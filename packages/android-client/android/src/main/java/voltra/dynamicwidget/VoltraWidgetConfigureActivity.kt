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
 * Reconfigure on Android 12+: for each `dynamicOptions` parameter the widget declares, lists the
 * choices `setWidgetParameterOptions` stored, and saves the picks as that placement's own
 * configuration. The config plugin declares it.
 */
class VoltraWidgetConfigureActivity : Activity() {
    private val picks = mutableMapOf<String, String>()

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
        val options = runBlocking { store.options(widgetId) }
        val current = runBlocking { store.get(widgetId, appWidgetId) }
        ask(widgetId, appWidgetId, store.dynamicParameters(widgetId), options, current)
    }

    // One picker per declared `dynamicOptions` parameter, in declared order: dismissing one opens
    // the next, and the last saves every pick at once.
    private fun ask(
        widgetId: String,
        appWidgetId: Int,
        parameters: List<String>,
        options: Map<String, List<Pair<String, String>>>,
        current: Map<String, String>,
    ) {
        val parameter = parameters.firstOrNull() ?: return saveAndFinish(widgetId, appWidgetId)
        val choices = options[parameter].orEmpty()
        val title = parameterTitle(widgetId, parameter) ?: applicationInfo.loadLabel(packageManager).toString()

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
                .setOnDismissListener { ask(widgetId, appWidgetId, parameters.drop(1), options, current) }
        if (choices.isEmpty()) {
            dialog.setMessage("No $title to choose from yet. Open the app to add one.")
        } else {
            dialog.setSingleChoiceItems(
                choices.map { it.second }.toTypedArray(),
                choices.indexOfFirst { it.first == current[parameter] },
            ) { shown, which ->
                picks[parameter] = choices[which].first
                shown.dismiss()
            }
        }
        dialog.show()
    }

    private fun saveAndFinish(
        widgetId: String,
        appWidgetId: Int,
    ) {
        if (picks.isNotEmpty()) {
            runBlocking {
                VoltraConfigurationStore(this@VoltraWidgetConfigureActivity).setInstanceValues(
                    widgetId,
                    appWidgetId,
                    picks,
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
