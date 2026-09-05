package voltra.dynamicwidget

import android.content.Context

/**
 * Extra `env` fields contributed by whatever is driving a Dynamic Widget's props.
 *
 * This is the only seam ADR 0002 opens in the existing Dynamic render path. A plain Dynamic
 * Widget has no source and its `env` is unchanged; a server-driven one is given a source that
 * contributes `env.serverUpdate`, so the widget can say "updated 3 min ago" or "offline" without
 * the server having to tell it.
 *
 * Values are written straight into the env JSON, so they must be things `org.json` understands:
 * a `JSONObject`, a `String`, a number, or a boolean.
 */
fun interface DynamicWidgetEnvironmentSource {
    fun environmentFields(
        context: Context,
        dynamicWidgetId: String,
    ): Map<String, Any>
}
