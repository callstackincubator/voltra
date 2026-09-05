package voltra.dynamicwidget

import android.content.Context
import androidx.glance.action.Action

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
interface DynamicWidgetEnvironmentSource {
    fun environmentFields(
        context: Context,
        dynamicWidgetId: String,
    ): Map<String, Any>

    /**
     * The action a refresh button should run, or null when the widget draws no button.
     *
     * Only something that can actually refresh the widget can answer this, which is why it lives
     * next to the env fields rather than on the Glance widget. A plain Dynamic Widget has nothing
     * to refresh from, so it never draws one.
     */
    fun refreshAction(
        context: Context,
        dynamicWidgetId: String,
    ): Action? = null
}
