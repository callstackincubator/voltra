package voltra.dynamicwidget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import voltra.widget.server.WidgetScope

/**
 * Process-persistent JSON props for Android Dynamic Widgets.
 *
 * Each Dynamic Widget has an independently versioned entry so the storage shape can evolve without
 * coupling migrations across Dynamic Widgets.
 *
 * ADR 0007 adds an instance slot per [WidgetScope.Instance.storageKey], written only by a
 * per-instance server fetch. A render reads the instance slot for the placement's key and falls
 * back to the widget slot when it is empty, so `updateAndroidDynamicWidget` stays the app's
 * type-level override and a placement that has not fetched yet shows whatever the app last wrote
 * rather than `{}`. An index of instance keys per widget id is kept alongside so clearing a widget's
 * props, and logout, can drop every instance slot without enumerating placements.
 */
internal class DynamicWidgetPropsStore(
    context: Context,
) : DynamicWidgetPropsPersistence {
    private val dynamicWidgetPropsPreferences: SharedPreferences =
        context.applicationContext.getSharedPreferences(
            DYNAMIC_WIDGET_PROPS_STORAGE_NAMESPACE,
            Context.MODE_PRIVATE,
        )

    /** The type-level (widget-scoped) write path — the app's `updateAndroidDynamicWidget`. */
    override fun persistDynamicWidgetProps(
        dynamicWidgetId: String,
        dynamicWidgetPropsJson: String,
    ) = persist(dynamicWidgetPropsStorageKey(dynamicWidgetId), dynamicWidgetPropsJson)

    /** The instance write path — a committed per-instance server fetch (ADR 0007). */
    fun persistInstanceDynamicWidgetProps(
        scope: WidgetScope.Instance,
        dynamicWidgetPropsJson: String,
    ) {
        persist(dynamicWidgetInstancePropsStorageKey(scope), dynamicWidgetPropsJson)
        addInstanceKeyToIndex(scope)
    }

    private fun persist(
        storageKey: String,
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
                .putString(storageKey, dynamicWidgetPropsStorageEntry.toString())
                .commit()

        check(dynamicWidgetPropsPersisted) {
            "Failed to persist Dynamic Widget props for key=$storageKey"
        }
    }

    /** The type-level props only, with no instance fallback — used by the trial render. */
    fun getDynamicWidgetProps(dynamicWidgetId: String): String =
        readProps(dynamicWidgetPropsStorageKey(dynamicWidgetId))

    /**
     * Props for one placement: the instance slot for [scope]'s key, falling back to the widget slot
     * when the instance has not fetched yet or has no configuration (ADR 0007).
     */
    fun getDynamicWidgetProps(scope: WidgetScope): String =
        when (scope) {
            is WidgetScope.Widget -> {
                getDynamicWidgetProps(scope.widgetId)
            }

            is WidgetScope.Instance -> {
                val instanceProps = readPropsOrNull(dynamicWidgetInstancePropsStorageKey(scope))
                instanceProps ?: getDynamicWidgetProps(scope.widgetId)
            }
        }

    private fun readProps(storageKey: String): String = readPropsOrNull(storageKey) ?: EMPTY_DYNAMIC_WIDGET_PROPS_JSON

    private fun readPropsOrNull(storageKey: String): String? {
        val dynamicWidgetPropsStorageEntry =
            dynamicWidgetPropsPreferences.getString(storageKey, null) ?: return null

        return try {
            val dynamicWidgetPropsStorageObject = JSONObject(dynamicWidgetPropsStorageEntry)
            if (
                dynamicWidgetPropsStorageObject.optInt(DYNAMIC_WIDGET_PROPS_STORAGE_VERSION_KEY) !=
                CURRENT_DYNAMIC_WIDGET_PROPS_STORAGE_VERSION
            ) {
                return null
            }

            dynamicWidgetPropsStorageObject.optJSONObject(DYNAMIC_WIDGET_PROPS_VALUE_KEY)?.toString()
        } catch (_: JSONException) {
            null
        }
    }

    /** The instance keys [dynamicWidgetId] has ever fetched into, so callers can clear per-instance state that lives in other stores (status, ETag). */
    fun instanceKeys(dynamicWidgetId: String): Set<String> = readInstanceKeyIndex(dynamicWidgetId)

    /**
     * Clears the widget-level props and every instance slot of [dynamicWidgetId] (ADR 0007):
     * `clearAndroidWidget` and logout are meant to reset a widget entirely, not leave stale
     * per-instance data behind that a fallback would never reveal again.
     */
    fun clearDynamicWidgetProps(dynamicWidgetId: String) {
        val instanceKeys = readInstanceKeyIndex(dynamicWidgetId)
        val editor =
            dynamicWidgetPropsPreferences
                .edit()
                .remove(dynamicWidgetPropsStorageKey(dynamicWidgetId))
                .remove(instanceKeyIndexStorageKey(dynamicWidgetId))

        instanceKeys.forEach { key -> editor.remove(dynamicWidgetInstancePropsStorageKey(dynamicWidgetId, key)) }

        check(editor.commit()) {
            "Failed to clear Dynamic Widget props for dynamicWidgetId=$dynamicWidgetId"
        }
    }

    fun clearAllDynamicWidgetProps() {
        val dynamicWidgetPropsCleared = dynamicWidgetPropsPreferences.edit().clear().commit()

        check(dynamicWidgetPropsCleared) {
            "Failed to clear all Dynamic Widget props"
        }
    }

    private fun addInstanceKeyToIndex(scope: WidgetScope.Instance) {
        val indexKey = instanceKeyIndexStorageKey(scope.widgetId)
        val current = readInstanceKeyIndex(scope.widgetId)
        if (scope.key in current) return

        val sortedKeys = (current + scope.key).sorted()
        val array = JSONArray()
        sortedKeys.forEach { array.put(it) }
        val updated = JSONObject().put(INSTANCE_KEY_INDEX_VALUE_KEY, array)
        dynamicWidgetPropsPreferences.edit().putString(indexKey, updated.toString()).apply()
    }

    private fun readInstanceKeyIndex(dynamicWidgetId: String): Set<String> {
        val raw =
            dynamicWidgetPropsPreferences.getString(instanceKeyIndexStorageKey(dynamicWidgetId), null)
                ?: return emptySet()

        return try {
            val array = JSONObject(raw).optJSONArray(INSTANCE_KEY_INDEX_VALUE_KEY) ?: return emptySet()
            (0 until array.length()).mapNotNull { array.optString(it, null) }.toSet()
        } catch (_: JSONException) {
            emptySet()
        }
    }

    private fun dynamicWidgetPropsStorageKey(dynamicWidgetId: String): String =
        "$DYNAMIC_WIDGET_PROPS_STORAGE_KEY_PREFIX$dynamicWidgetId"

    private fun dynamicWidgetInstancePropsStorageKey(scope: WidgetScope.Instance): String =
        dynamicWidgetInstancePropsStorageKey(scope.widgetId, scope.key)

    private fun dynamicWidgetInstancePropsStorageKey(
        dynamicWidgetId: String,
        key: String,
    ): String = "$DYNAMIC_WIDGET_PROPS_STORAGE_KEY_PREFIX$dynamicWidgetId#$key"

    private fun instanceKeyIndexStorageKey(dynamicWidgetId: String): String =
        "$DYNAMIC_WIDGET_PROPS_INDEX_KEY_PREFIX$dynamicWidgetId"

    private companion object {
        private const val DYNAMIC_WIDGET_PROPS_STORAGE_NAMESPACE = "voltra_dynamic_widget_props"
        private const val DYNAMIC_WIDGET_PROPS_STORAGE_KEY_PREFIX = "dynamic_widget_props."
        private const val DYNAMIC_WIDGET_PROPS_INDEX_KEY_PREFIX = "dynamic_widget_props_instances."
        private const val DYNAMIC_WIDGET_PROPS_STORAGE_VERSION_KEY = "dynamicWidgetPropsStorageVersion"
        private const val DYNAMIC_WIDGET_PROPS_VALUE_KEY = "dynamicWidgetProps"
        private const val INSTANCE_KEY_INDEX_VALUE_KEY = "instanceKeys"
        private const val CURRENT_DYNAMIC_WIDGET_PROPS_STORAGE_VERSION = 1
        private const val EMPTY_DYNAMIC_WIDGET_PROPS_JSON = "{}"
    }
}
