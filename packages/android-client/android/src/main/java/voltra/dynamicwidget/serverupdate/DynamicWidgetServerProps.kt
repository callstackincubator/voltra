package voltra.dynamicwidget.serverupdate

import org.json.JSONArray
import org.json.JSONObject

/** What a `200` body turned out to be. */
internal sealed class DynamicWidgetPropsParseResult {
    data class Props(
        val json: String,
    ) : DynamicWidgetPropsParseResult()

    data class Invalid(
        val reason: String,
    ) : DynamicWidgetPropsParseResult()
}

/**
 * Reads a server response as Dynamic Widget props.
 *
 * The whole point of ADR 0002 is that the server returns data, not UI, so the only thing accepted
 * here is a JSON object. The one shape called out specially is a Voltra payload: `serverUpdate` is
 * the same config key for both engines, so pointing a widget with an `entry` at a payload endpoint
 * is the easy mistake to make, and it has to fail loudly rather than look like unusable props.
 */
internal object DynamicWidgetServerProps {
    fun parse(body: String): DynamicWidgetPropsParseResult {
        val trimmed = body.trim()

        if (trimmed.isEmpty()) {
            return DynamicWidgetPropsParseResult.Invalid("response body was empty")
        }

        if (trimmed.startsWith("[")) {
            return DynamicWidgetPropsParseResult.Invalid(
                "response body is a JSON array; a Dynamic Widget's props must be a JSON object",
            )
        }

        val parsed =
            try {
                JSONObject(trimmed)
            } catch (_: Exception) {
                return DynamicWidgetPropsParseResult.Invalid(
                    "response body is not a JSON object; a Dynamic Widget's props must be a JSON object",
                )
            }

        if (looksLikeVoltraPayload(parsed)) {
            return DynamicWidgetPropsParseResult.Invalid(
                "response body looks like a Voltra payload (top-level 'v' with 'variants' or 'e'). " +
                    "This widget has an entry, so it renders on the device: return the props it should " +
                    "render, not a rendered payload.",
            )
        }

        return DynamicWidgetPropsParseResult.Props(parsed.toString())
    }

    /**
     * A Voltra payload always carries a version under `v` alongside either the size variants a
     * widget renders or the shared element table. Props that happen to have a `v` key are not
     * mistaken for one.
     */
    private fun looksLikeVoltraPayload(body: JSONObject): Boolean {
        if (body.opt("v") !is Int) return false

        return body.opt("variants") is JSONObject || body.opt("e") is JSONArray
    }
}
