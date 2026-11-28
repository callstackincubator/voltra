package voltra.dynamicwidget

import android.app.Activity
import android.app.AlertDialog
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.text.InputType
import android.util.Log
import android.widget.EditText
import android.widget.FrameLayout
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import voltra.R
import voltra.dynamicwidget.serverupdate.DynamicWidgetServerUpdateScheduler

/**
 * Voltra's widget configuration screen (ADR 0015), opened by the launcher's Reconfigure action on
 * Android 12+ for a widget with `configurationScreen`. It lists every `appIntent` parameter with
 * the value the placement uses now, lets the user change them, and saves the changes as that
 * placement's own values: the same write as `setWidgetInstanceConfiguration`.
 *
 * The config plugin declares it, and points only the `res/xml-v31` widget info at it, as optional
 * and reconfigurable, so adding a widget does not open it and older Android versions never do.
 */
class VoltraWidgetConfigureActivity : Activity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private lateinit var widgetId: String
    private lateinit var rows: List<ConfigurationRow>
    private val edits = mutableMapOf<String, String>()

    /** What to do once the dialog on screen is dismissed. Null leaves without saving. */
    private var afterDismiss: (() -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        appWidgetId = intent?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            ?: AppWidgetManager.INVALID_APPWIDGET_ID
        // Every way out keeps the placement. A launcher that ignores configuration_optional and opens
        // this on add would otherwise drop the widget on RESULT_CANCELED.
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))

        // The activity is exported, so only a placement of one of this app's Dynamic Widgets is
        // configured; anything else closes the screen without touching anything (ADR 0006).
        val resolved =
            try {
                DynamicWidgetInstanceResolver(
                    AndroidDynamicWidgetInstanceBoundary(this),
                ).resolveDynamicWidgetId(appWidgetId)
            } catch (e: Exception) {
                Log.w(TAG, "Not configuring appWidgetId $appWidgetId: ${e.message}")
                null
            }
        val parameters = resolved?.let { VoltraWidgetConfigurationScreens.parameters(this, it) }.orEmpty()
        if (resolved == null || parameters.isEmpty()) {
            finish()
            return
        }

        widgetId = resolved
        val store = VoltraConfigurationStore(this)
        rows =
            runBlocking {
                configurationRows(parameters, store.options(resolved), store.get(resolved, appWidgetId), ::stringOrNull)
            }
        showParameters()
    }

    private fun showParameters() {
        val labels =
            rows
                .map { row ->
                    val value = valueLabel(row)
                    if (value.isEmpty()) row.title else "${row.title}\n$value"
                }.toTypedArray()
        show(
            dialog()
                .setTitle(widgetLabel())
                .setItems(labels) { _, which -> afterDismiss = { edit(rows[which]) } }
                .setPositiveButton(android.R.string.ok) { _, _ -> afterDismiss = { close(save = true) } }
                .setNegativeButton(android.R.string.cancel, null),
        )
    }

    private fun edit(row: ConfigurationRow) {
        val builder = dialog().setTitle(row.title)
        when (row) {
            is ConfigurationRow.Choices -> {
                if (row.choices.isEmpty()) {
                    builder
                        .setMessage(
                            R.string.voltra_configure_no_choices,
                        ).setPositiveButton(android.R.string.ok, null)
                } else {
                    builder.setSingleChoiceItems(
                        row.choices.map { it.second }.toTypedArray(),
                        row.choices.indexOfFirst { it.first == currentValue(row) },
                    ) { shown, which ->
                        edits[row.name] = row.choices[which].first
                        shown.dismiss()
                    }
                }
            }

            is ConfigurationRow.Text -> {
                val input =
                    EditText(this).apply {
                        inputType = InputType.TYPE_CLASS_TEXT
                        setText(currentValue(row))
                        setSelection(text.length)
                    }
                val padding = (20 * resources.displayMetrics.density).toInt()
                val container = FrameLayout(this).apply { setPadding(padding, 0, padding, 0) }
                container.addView(input)
                builder
                    .setView(container)
                    .setPositiveButton(android.R.string.ok) { _, _ -> edits[row.name] = input.text.toString() }
                    .setNegativeButton(android.R.string.cancel, null)
            }
        }
        afterDismiss = ::showParameters
        show(builder)
    }

    private fun close(save: Boolean) {
        val values = if (save) edits.toMap() else emptyMap()
        if (values.isNotEmpty()) {
            // Written before finishing, so the picks survive even if the process goes right after.
            runBlocking {
                VoltraConfigurationStore(
                    this@VoltraWidgetConfigureActivity,
                ).setInstanceValues(widgetId, appWidgetId, values)
            }
        }
        val context = applicationContext
        val widget = widgetId
        val instance = appWidgetId
        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (values.isNotEmpty()) {
                    // The placement may have moved to a different instance scope (ADR 0007).
                    DynamicWidgetServerUpdateScheduler.recompute(context, widget)
                }
                // Always redraw: a launcher that opened this on add sends no first update of its own.
                triggerDynamicWidgetInstanceConfigurationGlanceUpdate(context, widget, instance)
            } catch (e: Throwable) {
                Log.w(TAG, "Could not redraw '$widget' instance $instance: ${e.message}")
            }
        }
        finish()
    }

    // Each dialog leaves through its dismiss listener, whichever button or gesture closed it.
    private fun show(builder: AlertDialog.Builder) {
        builder
            .setOnDismissListener {
                val next = afterDismiss
                afterDismiss = null
                if (next != null) next() else close(save = false)
            }.show()
    }

    private fun currentValue(row: ConfigurationRow) = edits[row.name] ?: row.value

    private fun valueLabel(row: ConfigurationRow): String {
        val value = currentValue(row)
        return when (row) {
            is ConfigurationRow.Choices -> row.choices.firstOrNull { it.first == value }?.second ?: value
            is ConfigurationRow.Text -> value
        }
    }

    private fun widgetLabel(): CharSequence =
        AppWidgetManager.getInstance(this).getAppWidgetInfo(appWidgetId)?.loadLabel(packageManager)
            ?: applicationInfo.loadLabel(packageManager)

    private fun dialog(): AlertDialog.Builder {
        val night =
            resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        val theme =
            if (night) {
                android.R.style.Theme_DeviceDefault_Dialog_Alert
            } else {
                android.R.style.Theme_DeviceDefault_Light_Dialog_Alert
            }
        return AlertDialog.Builder(this, theme)
    }

    private fun stringOrNull(name: String): String? {
        val id = resources.getIdentifier(name, "string", packageName)
        return if (id == 0) null else getString(id)
    }

    private companion object {
        private const val TAG = "VoltraWidgetConfigure"
    }
}
