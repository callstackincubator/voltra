package voltra.dynamicwidget

import android.content.Context
import androidx.glance.action.Action
import voltra.widget.server.WidgetScope

/**
 * Extra `env` fields contributed by whatever is driving a Dynamic Widget's props.
 *
 * This is the only seam ADR 0002 opens in the existing Dynamic render path. A plain Dynamic
 * Widget has no source and its `env` is unchanged; a server-driven one is given a source that
 * contributes `env.serverUpdate`, so the widget can say "updated 3 min ago" or "offline" without
 * the server having to tell it.
 *
 * [scope] carries the instance key (ADR 0007): `env.serverUpdate` for a placement comes from its
 * own instance's status record, not the widget's as a whole.
 *
 * Values are written straight into the env JSON, so they must be things `org.json` understands:
 * a `JSONObject`, a `String`, a number, or a boolean.
 */
interface DynamicWidgetEnvironmentSource {
    fun environmentFields(
        context: Context,
        scope: WidgetScope,
    ): Map<String, Any>

    /**
     * The action a refresh button should run, or null when the widget draws no button.
     *
     * Only something that can actually refresh the widget can answer this, which is why it lives
     * next to the env fields rather than on the Glance widget. A plain Dynamic Widget has nothing
     * to refresh from, so it never draws one.
     *
     * Takes the same [scope] as [environmentFields], and for the same reason: the button belongs to
     * one placement, so the fetch it triggers has to run for that placement's instance rather than
     * for the widget as a whole (ADR 0007).
     */
    fun refreshAction(
        context: Context,
        scope: WidgetScope,
    ): Action? = null
}
