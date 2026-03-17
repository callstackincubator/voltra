package voltra.styling

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.text.FontWeight

/**
 * Parses JavaScript style values into Kotlin types.
 * Mirrors iOS JSStyleParser.swift - handles type conversions and fallbacks.
 */
object JSStyleParser {
    private const val TAG = "JSStyleParser"

    /**
     * Parse a number value (Int, Long, Float, Double) to Float.
     * Returns null if value cannot be converted.
     */
    fun number(value: Any?): Float? =
        when (value) {
            is Int -> value.toFloat()
            is Long -> value.toFloat()
            is Float -> value
            is Double -> value.toFloat()
            is String -> value.toFloatOrNull()
            else -> null
        }

    /**
     * Parse a number value to Dp.
     */
    fun dp(value: Any?): Dp? = number(value)?.dp

    /**
     * Parse a number value to sp (for font sizes).
     */
    fun sp(value: Any?): TextUnit? = number(value)?.sp

    /**
     * Parse boolean values with fallback support.
     */
    fun boolean(value: Any?): Boolean =
        when (value) {
            is Boolean -> value
            is Int -> value == 1
            is String -> value.equals("true", ignoreCase = true)
            else -> false
        }

    /**
     * Parse a size object {width: number, height: number}.
     */
    fun size(value: Any?): Offset? {
        if (value !is Map<*, *>) return null
        val w = number(value["width"]) ?: 0f
        val h = number(value["height"]) ?: 0f
        return Offset(w.dp, h.dp)
    }

    /**
     * Parse color string (delegates to JSColorParser).
     */
    fun color(value: Any?): androidx.compose.ui.graphics.Color? = JSColorParser.parse(value)

    /**
     * Parse edge insets using short property names from JS payload.
     *
     * Short name mappings:
     * - padding: pad, pt (top), pb (bottom), pl (left), pr (right), pv (vertical), ph (horizontal)
     */
    fun parseInsets(
        from: Map<String, Any?>,
        prefix: String,
    ): EdgeInsets {
        // Determine the expanded names based on prefix
        val keys =
            when (prefix) {
                "padding" -> {
                    arrayOf(
                        "padding",
                        "paddingTop",
                        "paddingBottom",
                        "paddingLeft",
                        "paddingRight",
                        "paddingVertical",
                        "paddingHorizontal",
                    )
                }

                "margin" -> {
                    arrayOf(
                        "margin",
                        "marginTop",
                        "marginBottom",
                        "marginLeft",
                        "marginRight",
                        "marginVertical",
                        "marginHorizontal",
                    )
                }

                else -> {
                    arrayOf(
                        prefix,
                        "${prefix}Top",
                        "${prefix}Bottom",
                        "${prefix}Left",
                        "${prefix}Right",
                        "${prefix}Vertical",
                        "${prefix}Horizontal",
                    )
                }
            }

        val allKey = keys[0]
        val topKey = keys[1]
        val bottomKey = keys[2]
        val leftKey = keys[3]
        val rightKey = keys[4]
        val verticalKey = keys[5]
        val horizontalKey = keys[6]

        val all = number(from[allKey]) ?: 0f
        val v = number(from[verticalKey]) ?: all
        val h = number(from[horizontalKey]) ?: all

        val top = number(from[topKey]) ?: v
        val bottom = number(from[bottomKey]) ?: v
        val leading = number(from[leftKey]) ?: h
        val trailing = number(from[rightKey]) ?: h

        return EdgeInsets(
            top = top.dp,
            leading = leading.dp,
            bottom = bottom.dp,
            trailing = trailing.dp,
        )
    }

    /**
     * Parse font weight from string or number.
     * Maps "bold", "600", "normal" -> FontWeight
     */
    fun fontWeight(value: Any?): FontWeight? {
        val string = value?.toString()?.lowercase() ?: return null

        return when (string) {
            "bold", "700" -> FontWeight.Bold

            "medium", "500" -> FontWeight.Medium

            "normal", "400", "regular" -> FontWeight.Normal

            // Glance doesn't support these weights, but we map to closest
            "semibold", "600" -> FontWeight.Bold

            "light", "300" -> FontWeight.Normal

            "thin", "100", "200" -> FontWeight.Normal

            "heavy", "800", "900", "black" -> FontWeight.Bold

            else -> null
        }
    }

    /**
     * Parse text alignment from string.
     * Maps "center", "right", "justify" -> TextAlignment
     */
    fun textAlignment(value: Any?): TextAlignment {
        val string = value?.toString()?.lowercase() ?: return TextAlignment.START

        return when (string) {
            "center" -> TextAlignment.CENTER
            "right", "end" -> TextAlignment.END
            "left", "start" -> TextAlignment.START
            else -> TextAlignment.START
        }
    }

    /**
     * Parse text decoration from string.
     * Supports "underline", "line-through", "strikethrough".
     */
    fun textDecoration(value: Any?): TextDecoration {
        val string = value?.toString()?.lowercase() ?: return TextDecoration.NONE

        val hasUnderline = string.contains("underline")
        val hasLineThrough = string.contains("line-through") || string.contains("strikethrough")

        return when {
            hasUnderline && hasLineThrough -> TextDecoration.UNDERLINE_LINE_THROUGH
            hasUnderline -> TextDecoration.UNDERLINE
            hasLineThrough -> TextDecoration.LINE_THROUGH
            else -> TextDecoration.NONE
        }
    }

    /**
     * Parse visibility from generic value.
     */
    fun visibility(value: Any?): androidx.glance.Visibility? {
        val string = value?.toString()?.lowercase() ?: return null
        return when (string) {
            "none" -> androidx.glance.Visibility.Gone
            "hidden", "invisible" -> androidx.glance.Visibility.Invisible
            "flex", "visible" -> androidx.glance.Visibility.Visible
            else -> null
        }
    }

    /**
     * Parse overflow behavior.
     */
    fun overflow(value: Any?): Overflow? {
        val string = value?.toString()?.lowercase() ?: return null

        return when (string) {
            "hidden" -> Overflow.HIDDEN
            "visible" -> Overflow.VISIBLE
            else -> null
        }
    }

    /**
     * Parse glass effect (iOS-specific, not supported in Glance).
     */
    fun glassEffect(value: Any?): GlassEffect? {
        val string = value?.toString()?.lowercase() ?: return null

        return when (string) {
            "clear" -> GlassEffect.CLEAR
            "identity" -> GlassEffect.IDENTITY
            "regular" -> GlassEffect.REGULAR
            "none" -> GlassEffect.NONE
            else -> null
        }
    }

    /**
     * Parse font variants from array or single string.
     */
    fun fontVariant(value: Any?): Set<FontVariant> {
        val variants = mutableSetOf<FontVariant>()

        when (value) {
            is List<*> -> {
                value.forEach { variantString ->
                    FontVariant
                        .values()
                        .find {
                            it.value == variantString.toString()
                        }?.let { variants.add(it) }
                }
            }

            is String -> {
                FontVariant
                    .values()
                    .find {
                        it.value == value
                    }?.let { variants.add(it) }
            }
        }

        return variants
    }

    /**
     * Parse RN transform array: [{ rotate: '45deg' }, { scale: 1.5 }]
     * Returns null if no valid transforms found.
     */
    fun transform(value: Any?): TransformStyle? {
        if (value !is List<*>) return null

        var rotate: Float? = null
        var scale: Float? = null
        var scaleX: Float? = null
        var scaleY: Float? = null

        value.forEach { item ->
            if (item is Map<*, *>) {
                // Handle rotate: '45deg' or rotate: '0.785rad'
                item["rotate"]?.let { rotateStr ->
                    rotate = parseAngle(rotateStr.toString())
                }
                item["rotateZ"]?.let { rotateStr ->
                    rotate = parseAngle(rotateStr.toString())
                }
                // Handle scale
                item["scale"]?.let { scaleValue ->
                    scale = number(scaleValue)
                }
                // Handle scaleX
                item["scaleX"]?.let { scaleValue ->
                    scaleX = number(scaleValue)
                }
                // Handle scaleY
                item["scaleY"]?.let { scaleValue ->
                    scaleY = number(scaleValue)
                }
            }
        }

        // Only return if at least one transform is set
        return if (rotate != null || scale != null || scaleX != null || scaleY != null) {
            TransformStyle(rotate, scale, scaleX, scaleY)
        } else {
            null
        }
    }

    /**
     * Parse angle string like '45deg' or '0.785rad' to degrees.
     */
    private fun parseAngle(value: String): Float? {
        val trimmed = value.trim()

        return when {
            trimmed.endsWith("deg") -> {
                trimmed.dropLast(3).toFloatOrNull()
            }

            trimmed.endsWith("rad") -> {
                trimmed.dropLast(3).toFloatOrNull()?.let {
                    it * 180f / Math.PI.toFloat()
                }
            }

            else -> {
                // Try parsing as plain number (assume degrees)
                trimmed.toFloatOrNull()
            }
        }
    }
}
