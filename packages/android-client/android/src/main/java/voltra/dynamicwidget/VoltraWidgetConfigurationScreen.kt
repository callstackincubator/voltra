package voltra.dynamicwidget

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.IOException

/**
 * One `appIntent` parameter of a widget with `configurationScreen`, as the config plugin wrote it
 * to `assets/voltra/widget_configuration_screens.json` (ADR 0015). Titles are string resource names
 * in `voltra_widgets.xml`, so the localized copy comes from the app's resources.
 */
internal data class ConfigurationScreenParameter(
    val name: String,
    val titleResource: String?,
    /** Fixed choices as (value, title resource name), or null when the parameter has none. */
    val options: List<Pair<String, String>>?,
    val dynamicOptions: Boolean,
)

/** One row of the configuration screen: a parameter, its label and the value the placement uses. */
internal sealed class ConfigurationRow {
    abstract val name: String
    abstract val title: String
    abstract val value: String

    /** Pick one of [choices], each a (value, label) pair. Empty for `dynamicOptions` not set yet. */
    data class Choices(
        override val name: String,
        override val title: String,
        override val value: String,
        val choices: List<Pair<String, String>>,
    ) : ConfigurationRow()

    /** Free text. */
    data class Text(
        override val name: String,
        override val title: String,
        override val value: String,
    ) : ConfigurationRow()
}

internal object VoltraWidgetConfigurationScreens {
    private const val TAG = "VoltraWidgetConfigure"
    private const val ASSET_PATH = "voltra/widget_configuration_screens.json"

    @Volatile
    private var cache: Map<String, List<ConfigurationScreenParameter>>? = null

    /** The parameters [widgetId] offers on the screen, or none when it did not opt in. */
    fun parameters(
        context: Context,
        widgetId: String,
    ): List<ConfigurationScreenParameter> {
        val all = cache ?: read(context).also { cache = it }
        return all[widgetId].orEmpty()
    }

    private fun read(context: Context): Map<String, List<ConfigurationScreenParameter>> =
        try {
            parse(
                context.assets
                    .open(ASSET_PATH)
                    .bufferedReader()
                    .use { it.readText() },
            )
        } catch (e: IOException) {
            Log.d(TAG, "No $ASSET_PATH: no widget offers the configuration screen")
            emptyMap()
        }

    /** `{ "<widgetId>": [{ "name", "title"?, "options"?: [{ "value", "title" }], "dynamicOptions"? }] }` */
    fun parse(json: String): Map<String, List<ConfigurationScreenParameter>> {
        val root = JSONObject(json)
        return root.keys().asSequence().associateWith { widgetId ->
            val parameters = root.getJSONArray(widgetId)
            List(parameters.length()) { index ->
                val parameter = parameters.getJSONObject(index)
                val options =
                    parameter.optJSONArray("options")?.let { array ->
                        List(array.length()) {
                            array.getJSONObject(it).let { option ->
                                option.getString("value") to
                                    option.getString("title")
                            }
                        }
                    }
                ConfigurationScreenParameter(
                    name = parameter.getString("name"),
                    titleResource = parameter.optString("title").ifEmpty { null },
                    options = options,
                    dynamicOptions = parameter.optBoolean("dynamicOptions", false),
                )
            }
        }
    }
}

/**
 * The rows the screen shows, in declared order. [values] is what the placement renders with now
 * (all configuration layers merged), [storedOptions] the choices `setWidgetParameterOptions` set,
 * and [string] looks up a string resource by name. A missing title falls back to the parameter
 * name, a missing option title to its value.
 */
internal fun configurationRows(
    parameters: List<ConfigurationScreenParameter>,
    storedOptions: Map<String, List<Pair<String, String>>>,
    values: Map<String, String>,
    string: (String) -> String?,
): List<ConfigurationRow> =
    parameters.map { parameter ->
        val title = parameter.titleResource?.let(string) ?: parameter.name
        val value = values[parameter.name].orEmpty()
        when {
            parameter.dynamicOptions -> {
                ConfigurationRow.Choices(parameter.name, title, value, storedOptions[parameter.name].orEmpty())
            }

            parameter.options != null -> {
                ConfigurationRow.Choices(
                    parameter.name,
                    title,
                    value,
                    parameter.options.map { (optionValue, titleResource) ->
                        optionValue to
                            (string(titleResource) ?: optionValue)
                    },
                )
            }

            else -> {
                ConfigurationRow.Text(parameter.name, title, value)
            }
        }
    }
