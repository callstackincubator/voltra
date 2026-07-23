package voltra.dynamicwidget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONException
import org.json.JSONObject

/**
 * Process-persistent JSON props for Android Dynamic Widgets.
 *
 * Each Dynamic Widget has an independently versioned entry so the storage shape can evolve without
 * coupling migrations across Dynamic Widgets.
 */
internal class DynamicWidgetPropsStore(
    context: Context,
) : DynamicWidgetPropsPersistence {
    private val dynamicWidgetPropsPreferences: SharedPreferences =
        context.applicationContext.getSharedPreferences(
            DYNAMIC_WIDGET_PROPS_STORAGE_NAMESPACE,
            Context.MODE_PRIVATE,
        )

    override fun persistDynamicWidgetProps(
        dynamicWidgetId: String,
        dynamicWidgetPropsJson: String,
    ) {
        val dynamicWidgetProps = JSONObject(dynamicWidgetPropsJson)
        val dynamicWidgetPropsStorageEntry =
            JSONObject()
                .put(
                    DYNAMIC_WIDGET_PROPS_STORAGE_VERSION_KEY,
                    CURRENT_DYNAMIC_WIDGET_PROPS_STORAGE_VERSION,
                ).put(DYNAMIC_WIDGET_PROPS_VALUE_KEY, dynamicWidgetProps)

        val dynamicWidgetPropsPersisted =
            dynamicWidgetPropsPreferences
                .edit()
                .putString(dynamicWidgetPropsStorageKey(dynamicWidgetId), dynamicWidgetPropsStorageEntry.toString())
                .commit()

        check(dynamicWidgetPropsPersisted) {
            "Failed to persist Dynamic Widget props for dynamicWidgetId=$dynamicWidgetId"
        }
    }

    fun getDynamicWidgetProps(dynamicWidgetId: String): String {
        val dynamicWidgetPropsStorageEntry =
            dynamicWidgetPropsPreferences.getString(dynamicWidgetPropsStorageKey(dynamicWidgetId), null)
                ?: return EMPTY_DYNAMIC_WIDGET_PROPS_JSON

        return try {
            val dynamicWidgetPropsStorageObject = JSONObject(dynamicWidgetPropsStorageEntry)
            if (
                dynamicWidgetPropsStorageObject.optInt(DYNAMIC_WIDGET_PROPS_STORAGE_VERSION_KEY) !=
                CURRENT_DYNAMIC_WIDGET_PROPS_STORAGE_VERSION
            ) {
                return EMPTY_DYNAMIC_WIDGET_PROPS_JSON
            }

            dynamicWidgetPropsStorageObject
                .optJSONObject(DYNAMIC_WIDGET_PROPS_VALUE_KEY)
                ?.toString()
                ?: EMPTY_DYNAMIC_WIDGET_PROPS_JSON
        } catch (_: JSONException) {
            EMPTY_DYNAMIC_WIDGET_PROPS_JSON
        }
    }

    fun clearDynamicWidgetProps(dynamicWidgetId: String) {
        val dynamicWidgetPropsCleared =
            dynamicWidgetPropsPreferences
                .edit()
                .remove(dynamicWidgetPropsStorageKey(dynamicWidgetId))
                .commit()

        check(dynamicWidgetPropsCleared) {
            "Failed to clear Dynamic Widget props for dynamicWidgetId=$dynamicWidgetId"
        }
    }

    fun clearAllDynamicWidgetProps() {
        val dynamicWidgetPropsCleared = dynamicWidgetPropsPreferences.edit().clear().commit()

        check(dynamicWidgetPropsCleared) {
            "Failed to clear all Dynamic Widget props"
        }
    }

    private fun dynamicWidgetPropsStorageKey(dynamicWidgetId: String): String =
        "$DYNAMIC_WIDGET_PROPS_STORAGE_KEY_PREFIX$dynamicWidgetId"

    private companion object {
        private const val DYNAMIC_WIDGET_PROPS_STORAGE_NAMESPACE = "voltra_dynamic_widget_props"
        private const val DYNAMIC_WIDGET_PROPS_STORAGE_KEY_PREFIX = "dynamic_widget_props."
        private const val DYNAMIC_WIDGET_PROPS_STORAGE_VERSION_KEY = "dynamicWidgetPropsStorageVersion"
        private const val DYNAMIC_WIDGET_PROPS_VALUE_KEY = "dynamicWidgetProps"
        private const val CURRENT_DYNAMIC_WIDGET_PROPS_STORAGE_VERSION = 1
        private const val EMPTY_DYNAMIC_WIDGET_PROPS_JSON = "{}"
    }
}
