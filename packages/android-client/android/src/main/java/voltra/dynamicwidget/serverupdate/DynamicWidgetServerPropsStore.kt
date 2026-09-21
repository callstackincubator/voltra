package voltra.dynamicwidget.serverupdate

import android.content.Context
import org.json.JSONObject
import voltra.widget.server.WidgetScope

/**
 * What the widget is told about the server side of its props, as `env.serverUpdate`.
 *
 * Deliberately not the props themselves: fetched props are committed to the Dynamic Widget's
 * existing props slot, so the render path cannot tell whether they came from a fetch or from
 * `updateDynamicWidget`. This record is only the story around them.
 */
data class DynamicWidgetServerStatus(
    val status: String,
    val fetchedAt: Long? = null,
    val error: String? = null,
    val httpStatus: Int? = null,
) {
    fun toJson(): JSONObject {
        val json = JSONObject().put("status", status)

        fetchedAt?.let { json.put("fetchedAt", it) }
        error?.let { json.put("error", it) }
        httpStatus?.let { json.put("httpStatus", it) }

        return json
    }

    companion object {
        const val STATUS_FRESH = "fresh"
        const val STATUS_STALE = "stale"
        const val STATUS_NEVER = "never"
        const val STATUS_DISABLED = "disabled"

        const val ERROR_NETWORK = "network"
        const val ERROR_HTTP = "http"
        const val ERROR_UNAUTHORIZED = "unauthorized"
        const val ERROR_PARSE = "parse"
        const val ERROR_RENDER = "render"

        /** What a widget sees before any fetch has succeeded. */
        val NEVER = DynamicWidgetServerStatus(STATUS_NEVER)
    }
}

/**
 * Per-scope record of how the last fetch went.
 *
 * Kept in its own preferences file rather than alongside the props so that clearing a widget's
 * props — logout, `clearWidget` — and clearing its fetch history stay separate decisions.
 */
internal class DynamicWidgetServerPropsStore(
    context: Context,
) : DynamicWidgetServerStatusSink {
    private val preferences =
        context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun status(scope: WidgetScope): DynamicWidgetServerStatus {
        val raw = preferences.getString(key(scope), null) ?: return DynamicWidgetServerStatus.NEVER

        return try {
            val json = JSONObject(raw)

            DynamicWidgetServerStatus(
                status = json.optString("status", DynamicWidgetServerStatus.STATUS_NEVER),
                fetchedAt = if (json.has("fetchedAt")) json.optLong("fetchedAt") else null,
                error = if (json.has("error")) json.optString("error") else null,
                httpStatus = if (json.has("httpStatus")) json.optInt("httpStatus") else null,
            )
        } catch (_: Exception) {
            DynamicWidgetServerStatus.NEVER
        }
    }

    fun put(
        scope: WidgetScope,
        status: DynamicWidgetServerStatus,
    ) {
        preferences.edit().putString(key(scope), status.toJson().toString()).apply()
    }

    /**
     * Records a failure without losing the fact that a fetch once worked. `stale` is only
     * meaningful next to the `fetchedAt` of the last success, so that is carried forward.
     */
    override fun recordFailure(
        scope: WidgetScope,
        error: String,
        httpStatus: Int?,
    ) {
        val previous = status(scope)

        put(
            scope,
            DynamicWidgetServerStatus(
                status =
                    if (previous.fetchedAt == null) {
                        DynamicWidgetServerStatus.STATUS_NEVER
                    } else {
                        DynamicWidgetServerStatus.STATUS_STALE
                    },
                fetchedAt = previous.fetchedAt,
                error = error,
                httpStatus = httpStatus,
            ),
        )
    }

    override fun recordSuccess(
        scope: WidgetScope,
        fetchedAt: Long,
        httpStatus: Int,
    ) {
        put(
            scope,
            DynamicWidgetServerStatus(
                status = DynamicWidgetServerStatus.STATUS_FRESH,
                fetchedAt = fetchedAt,
                httpStatus = httpStatus,
            ),
        )
    }

    /**
     * Reports `disabled` once, keeping the last `fetchedAt` so a widget that comes back under app
     * control can still say when the server last spoke.
     */
    override fun markDisabledIfNeeded(
        scope: WidgetScope,
        enabled: Boolean,
    ) {
        if (enabled) return

        val previous = status(scope)

        if (previous.status == DynamicWidgetServerStatus.STATUS_DISABLED) return

        put(
            scope,
            DynamicWidgetServerStatus(
                status = DynamicWidgetServerStatus.STATUS_DISABLED,
                fetchedAt = previous.fetchedAt,
            ),
        )
    }

    fun clear(scope: WidgetScope) {
        preferences.edit().remove(key(scope)).apply()
    }

    fun clearAll() {
        preferences.edit().clear().apply()
    }

    private fun key(scope: WidgetScope) = "server_status.${scope.storageKey}"

    companion object {
        private const val PREFERENCES_NAME = "voltra_dynamic_widget_server"
    }
}
