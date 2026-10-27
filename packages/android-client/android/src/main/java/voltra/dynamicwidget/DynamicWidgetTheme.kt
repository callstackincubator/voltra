package voltra.dynamicwidget

import android.util.Log
import androidx.compose.ui.graphics.Color
import androidx.glance.color.ColorProvider
import androidx.glance.color.ColorProviders
import androidx.glance.color.colorProviders
import org.json.JSONException
import org.json.JSONObject
import org.json.JSONTokener
import voltra.styling.JSColorParser
import voltra.styling.VoltraColorValue
import voltra.styling.VoltraThemeColorRole
import voltra.styling.toColorProvider

/**
 * A Dynamic Widget's `theme` export: a day and a night color for any of the
 * [VoltraThemeColorRole]s, named as in `AndroidDynamicColors` (`primary`, `onPrimary`, …).
 *
 * Only a role with a color on both sides is themed; every other role keeps the palette the
 * widget would have used without a theme.
 */
internal class DynamicWidgetTheme(
    private val pairs: Map<VoltraThemeColorRole, Pair<Color, Color>>,
    /** Whether the system's dynamic palette (API 31+) wins over this theme. Defaults to true. */
    val dynamicColors: Boolean,
) {
    /** All 27 roles: this theme's day/night pair where it has one, [fallback]'s provider otherwise. */
    fun toColorProviders(fallback: ColorProviders): ColorProviders {
        fun role(role: VoltraThemeColorRole) =
            pairs[role]?.let { (day, night) -> ColorProvider(day = day, night = night) }
                ?: role.toColorProvider(fallback)

        return colorProviders(
            primary = role(VoltraThemeColorRole.PRIMARY),
            onPrimary = role(VoltraThemeColorRole.ON_PRIMARY),
            primaryContainer = role(VoltraThemeColorRole.PRIMARY_CONTAINER),
            onPrimaryContainer = role(VoltraThemeColorRole.ON_PRIMARY_CONTAINER),
            secondary = role(VoltraThemeColorRole.SECONDARY),
            onSecondary = role(VoltraThemeColorRole.ON_SECONDARY),
            secondaryContainer = role(VoltraThemeColorRole.SECONDARY_CONTAINER),
            onSecondaryContainer = role(VoltraThemeColorRole.ON_SECONDARY_CONTAINER),
            tertiary = role(VoltraThemeColorRole.TERTIARY),
            onTertiary = role(VoltraThemeColorRole.ON_TERTIARY),
            tertiaryContainer = role(VoltraThemeColorRole.TERTIARY_CONTAINER),
            onTertiaryContainer = role(VoltraThemeColorRole.ON_TERTIARY_CONTAINER),
            error = role(VoltraThemeColorRole.ERROR),
            errorContainer = role(VoltraThemeColorRole.ERROR_CONTAINER),
            onError = role(VoltraThemeColorRole.ON_ERROR),
            onErrorContainer = role(VoltraThemeColorRole.ON_ERROR_CONTAINER),
            background = role(VoltraThemeColorRole.BACKGROUND),
            onBackground = role(VoltraThemeColorRole.ON_BACKGROUND),
            surface = role(VoltraThemeColorRole.SURFACE),
            onSurface = role(VoltraThemeColorRole.ON_SURFACE),
            surfaceVariant = role(VoltraThemeColorRole.SURFACE_VARIANT),
            onSurfaceVariant = role(VoltraThemeColorRole.ON_SURFACE_VARIANT),
            outline = role(VoltraThemeColorRole.OUTLINE),
            inverseOnSurface = role(VoltraThemeColorRole.INVERSE_ON_SURFACE),
            inverseSurface = role(VoltraThemeColorRole.INVERSE_SURFACE),
            inversePrimary = role(VoltraThemeColorRole.INVERSE_PRIMARY),
            widgetBackground = role(VoltraThemeColorRole.WIDGET_BACKGROUND),
        )
    }

    companion object {
        private const val TAG = "DynamicWidgetTheme"

        /**
         * Parses the JSON [VoltraJSRenderer.themeJSON] returns; null JSON means no theme.
         *
         * A theme bug never blanks the widget, and each problem costs exactly one warning:
         * - a top level that isn't an object (which includes the strings Metro sends for a function,
         *   Symbol or unserialisable theme), or a `day`/`night` that isn't an object → no theme;
         * - a role defined on one side only, or whose value on a side is not a literal color (role
         *   tokens and `{ day, night }` pairs included) → that role is left out.
         */
        fun parse(json: String?): DynamicWidgetTheme? {
            if (json == null) return null
            val root =
                try {
                    JSONTokener(json).nextValue()
                } catch (e: JSONException) {
                    null
                }
            if (root !is JSONObject) {
                Log.w(TAG, "Ignoring the widget theme: expected an object with day and night, got $json")
                return null
            }
            val day = root.opt("day")
            val night = root.opt("night")
            if (day !is JSONObject || night !is JSONObject) {
                Log.w(TAG, "Ignoring the widget theme: day and night must both be objects, got $json")
                return null
            }
            val pairs =
                VoltraThemeColorRole.entries
                    .mapNotNull { role ->
                        val key = role.themeKey
                        rolePair(key, day.opt(key), night.opt(key))?.let { role to it }
                    }.toMap()
            return DynamicWidgetTheme(pairs, dynamicColors = root.optBoolean("dynamicColors", true))
        }

        /** The role's day and night colors, or null (with one warning when it was half-written). */
        private fun rolePair(
            key: String,
            dayValue: Any?,
            nightValue: Any?,
        ): Pair<Color, Color>? {
            if (dayValue == null && nightValue == null) return null
            val problem =
                when {
                    dayValue == null -> {
                        "it is only defined for night"
                    }

                    nightValue == null -> {
                        "it is only defined for day"
                    }

                    else -> {
                        // The night side is parsed only once the day side is valid, so a role broken
                        // on both sides costs no more warnings than one broken on a single side.
                        val dayColor = literalColor(dayValue)
                        val nightColor = dayColor?.let { literalColor(nightValue) }
                        if (dayColor != null && nightColor != null) return dayColor to nightColor
                        val side = if (dayColor == null) "day" else "night"
                        "its $side value ${if (dayColor == null) dayValue else nightValue} is not a literal color"
                    }
                }
            Log.w(TAG, "Ignoring theme role $key: $problem")
            return null
        }

        /** A literal color string; role tokens, pairs and other values are not. */
        private fun literalColor(value: Any): Color? =
            (value as? String)?.let { (JSColorParser.parse(it) as? VoltraColorValue.Static)?.color }

        /** The role's key in `AndroidDynamicColors`: `ON_PRIMARY_CONTAINER` → `onPrimaryContainer`. */
        private val VoltraThemeColorRole.themeKey: String
            get() =
                name
                    .lowercase()
                    .split('_')
                    .mapIndexed { index, word -> if (index == 0) word else word.replaceFirstChar { it.uppercase() } }
                    .joinToString("")
    }
}
