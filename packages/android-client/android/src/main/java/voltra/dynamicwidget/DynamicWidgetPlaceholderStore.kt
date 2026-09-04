package voltra.dynamicwidget

import android.content.Context
import android.util.Log
import org.json.JSONObject
import voltra.widget.InitialStateLocalePicker
import java.io.IOException
import java.nio.charset.Charset

private const val ASSET_INITIAL_STATES = "voltra_initial_states.json"

/**
 * Reads the raw text of the plugin-prerendered `voltra_initial_states.json` asset. Injectable so
 * [DynamicWidgetPlaceholderStore] is unit-testable without a real assets/ directory.
 */
internal fun interface DynamicWidgetPlaceholderAssetSource {
    fun readInitialStatesJson(): String?
}

/** Opens `voltra_initial_states.json` from `context.assets`, mirroring the payload path. */
internal class DefaultDynamicWidgetPlaceholderAssetSource(
    private val context: Context,
) : DynamicWidgetPlaceholderAssetSource {
    override fun readInitialStatesJson(): String? =
        try {
            context.assets
                .open(ASSET_INITIAL_STATES)
                .bufferedReader(Charset.forName("UTF-8"))
                .use { it.readText() }
        } catch (e: IOException) {
            null
        }
}

/**
 * Reads the Dynamic Widget placeholder node from the plugin-prerendered
 * `voltra_initial_states.json` asset ONLY. Per ADR 0000 ("Dynamic Widgets never read payload
 * state"), this store never consults the payload SharedPreferences store
 * (`voltra.widget.VoltraWidgetManager`'s `voltra_widgets` prefs) — a payload written under a
 * Dynamic widget id must never be handed to the Dynamic Widget's single-node decoder.
 */
internal class DynamicWidgetPlaceholderStore(
    private val context: Context,
    private val assetSource: DynamicWidgetPlaceholderAssetSource = DefaultDynamicWidgetPlaceholderAssetSource(context),
) {
    companion object {
        private const val TAG = "DynamicWidgetPlaceholderStore"
    }

    /**
     * Read the pre-rendered placeholder JSON for [widgetId] from the initial-states asset.
     * Returns null when the asset is missing/invalid or has no entry for [widgetId].
     */
    fun readPlaceholderJson(widgetId: String): String? {
        val jsonString = assetSource.readInitialStatesJson() ?: return null
        return try {
            val jsonObject = JSONObject(jsonString)
            if (!jsonObject.has(widgetId)) {
                null
            } else {
                when (val raw = jsonObject.get(widgetId)) {
                    is JSONObject -> InitialStateLocalePicker.resolveInitialStatePayload(raw, context.resources)
                    else -> raw.toString()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read placeholder for widgetId=$widgetId: ${e.message}")
            null
        }
    }
}
