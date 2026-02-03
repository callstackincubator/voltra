package voltra.styling

import androidx.compose.ui.unit.dp

/**
 * Converts JavaScript style dictionary into structured style objects.
 * Mirrors iOS StyleConverter.swift - parses JS values into typed Kotlin structures.
 */
object StyleConverter {
    private const val TAG = "StyleConverter"

    /**
     * Convert JavaScript style dictionary into structured styles.
     * Returns CompositeStyle with all style categories parsed.
     *
     * Mirrors iOS: StyleConverter.convert(_ js: [String: Any])
     */
    fun convert(js: Map<String, Any?>): CompositeStyle =
        CompositeStyle(
            layout = parseLayout(js),
            decoration = parseDecoration(js),
            rendering = parseRendering(js),
            text = parseText(js),
        )

    /**
     * Parse layout-related styles (dimensions, spacing, flex).
     * Uses expanded property names after decompression (e.g., "width" for width, "flex" for flex).
     */
    private fun parseLayout(js: Map<String, Any?>): LayoutStyle {
        // Flex logic: RN "flex: 1" implies grow. "flexGrow" is specific.
        // In Glance, we use weight() modifier for proper flex behavior.
        // Expanded names: flex, flexGrow
        val flexVal = JSStyleParser.number(js["flex"]) ?: 0f
        val flexGrow = JSStyleParser.number(js["flexGrow"]) ?: 0f
        val finalWeight = maxOf(flexVal, flexGrow)
        val weight = if (finalWeight > 0f) finalWeight else null

        // Position parsing (left/top -> Offset)
        // Expanded names: left, top
        var position: Offset? = null
        val left = JSStyleParser.dp(js["left"])
        val top = JSStyleParser.dp(js["top"])
        if (left != null || top != null) {
            position = Offset(left ?: 0.dp, top ?: 0.dp)
        }

        // zIndex: only set if explicitly provided in JS
        // Expanded name: zIndex
        val zIndex = JSStyleParser.number(js["zIndex"])

        return LayoutStyle(
            // Dimensions (width, height, minWidth/maxWidth/minHeight/maxHeight)
            // Support number (dp), "100%" (fill), "auto" (wrap), or null (wrap)
            width = parseSizeValue(js["width"]),
            height = parseSizeValue(js["height"]),
            minWidth = JSStyleParser.dp(js["minWidth"]),
            maxWidth = JSStyleParser.dp(js["maxWidth"]),
            minHeight = JSStyleParser.dp(js["minHeight"]),
            maxHeight = JSStyleParser.dp(js["maxHeight"]),
            // Flex Logic (aspectRatio)
            weight = weight,
            aspectRatio = JSStyleParser.number(js["aspectRatio"]),
            // Spacing (padding)
            padding = JSStyleParser.parseInsets(js, "padding"),
            // Positioning
            position = position,
            zIndex = zIndex,
            // Visibility logic:
            // display: 'none' -> Gone (takes no space)
            // visibility: 'hidden' -> Invisible (hides but takes space)
            visibility =
                run {
                    val d = JSStyleParser.visibility(js["display"])
                    val v = JSStyleParser.visibility(js["visibility"])

                    when {
                        d == androidx.glance.Visibility.Gone -> androidx.glance.Visibility.Gone
                        v == androidx.glance.Visibility.Invisible -> androidx.glance.Visibility.Invisible
                        else -> d ?: v
                    }
                },
        )
    }

    /**
     * Parse size value from JS - can be number (dp), "100%" (fill), or null/auto (wrap).
     */
    private fun parseSizeValue(value: Any?): SizeValue? =
        when (value) {
            is Number -> {
                SizeValue.Fixed(value.toFloat().dp)
            }

            "100%" -> {
                SizeValue.Fill
            }

            "auto" -> {
                SizeValue.Wrap
            }

            null -> {
                SizeValue.Wrap
            }

            else -> {
                // Try to parse as string percentage or number
                val str = value.toString()
                when {
                    str == "100%" -> {
                        SizeValue.Fill
                    }

                    str == "auto" -> {
                        SizeValue.Wrap
                    }

                    else -> {
                        // Try to parse as number
                        str.toFloatOrNull()?.let { SizeValue.Fixed(it.dp) } ?: SizeValue.Wrap
                    }
                }
            }
        }

    /**
     * Parse decoration-related styles (background, border, shadow).
     * Uses expanded property names after decompression.
     */
    private fun parseDecoration(js: Map<String, Any?>): DecorationStyle {
        // Border Logic (borderWidth, borderColor)
        var border: BorderStyle? = null
        val borderWidth = JSStyleParser.dp(js["borderWidth"])
        if (borderWidth != null && borderWidth.value > 0) {
            val borderColor =
                JSStyleParser.color(js["borderColor"])
                    ?: androidx.compose.ui.graphics.Color.Transparent
            border = BorderStyle(borderWidth, borderColor)
        }

        // Shadow Logic (RN iOS style) - not supported in Glance
        // Expanded names: shadowRadius, shadowOpacity, shadowOffset, shadowColor
        var shadow: ShadowStyle? = null
        val shadowRadius = JSStyleParser.dp(js["shadowRadius"])
        val shadowOpacity = JSStyleParser.number(js["shadowOpacity"])
        val shadowOffset = JSStyleParser.size(js["shadowOffset"])
        val shadowColor = JSStyleParser.color(js["shadowColor"])

        if (shadowRadius != null || shadowOpacity != null || shadowOffset != null || shadowColor != null) {
            val finalRadius = shadowRadius ?: 0.dp
            val finalOpacity = shadowOpacity ?: 1.0f
            val finalOffset = shadowOffset ?: Offset(0.dp, 0.dp)
            val finalColor = shadowColor ?: androidx.compose.ui.graphics.Color.Black

            if (finalOpacity > 0) {
                shadow = ShadowStyle(finalRadius, finalColor, finalOpacity, finalOffset)
            }
        }

        // Expanded names: glassEffect, overflow, backgroundColor, borderRadius
        val glassEffect = JSStyleParser.glassEffect(js["glassEffect"])
        val overflow = JSStyleParser.overflow(js["overflow"])
        val clipToOutline = overflow == Overflow.HIDDEN

        return DecorationStyle(
            backgroundColor = JSStyleParser.color(js["backgroundColor"]),
            cornerRadius = JSStyleParser.dp(js["borderRadius"]),
            clipToOutline = clipToOutline,
            border = border,
            shadow = shadow,
            glassEffect = glassEffect,
            overflow = overflow,
        )
    }

    /**
     * Parse rendering-related styles (opacity, transform).
     * Uses expanded property names: opacity, transform
     */
    private fun parseRendering(js: Map<String, Any?>): RenderingStyle {
        val opacity = JSStyleParser.number(js["opacity"]) ?: 1.0f
        return RenderingStyle(
            opacity = opacity,
            transform = JSStyleParser.transform(js["transform"]),
        )
    }

    /**
     * Parse text-related styles.
     * Uses expanded property names after decompression.
     */
    private fun parseText(js: Map<String, Any?>): TextStyle {
        var style = TextStyle.Default

        // Color
        val color = JSStyleParser.color(js["color"])
        if (color != null) {
            style = style.copy(color = color)
        }

        // Font size
        val fontSize = JSStyleParser.sp(js["fontSize"])
        if (fontSize != null) {
            style = style.copy(fontSize = fontSize)
        }

        // Line height: CSS lineHeight includes text size. We calculate extra spacing.
        // Note: Glance has limited line spacing support
        val lineHeight = JSStyleParser.number(js["lineHeight"])
        if (lineHeight != null) {
            val currentFontSize = fontSize?.value ?: 17f
            val spacing = lineHeight - currentFontSize
            style = style.copy(lineSpacing = maxOf(0f, spacing).dp)
        }

        // Font weight
        val fontWeight = JSStyleParser.fontWeight(js["fontWeight"])
        if (fontWeight != null) {
            style = style.copy(fontWeight = fontWeight)
        }

        // Text alignment
        val textAlign = js["textAlign"]
        if (textAlign != null) {
            style = style.copy(alignment = JSStyleParser.textAlignment(textAlign))
        }

        // Text decoration
        val decoration = js["textDecorationLine"]
        if (decoration != null) {
            style = style.copy(decoration = JSStyleParser.textDecoration(decoration))
        }

        // Number of lines
        val numberOfLines = (js["numberOfLines"] as? Number)?.toInt()
        if (numberOfLines != null) {
            style = style.copy(lineLimit = numberOfLines)
        }

        // Letter spacing (not supported in Glance)
        val letterSpacing = JSStyleParser.dp(js["letterSpacing"])
        if (letterSpacing != null) {
            style = style.copy(letterSpacing = letterSpacing)
        }

        // Font variant (not supported in Glance)
        val fontVariant = js["fontVariant"]
        if (fontVariant != null) {
            style = style.copy(fontVariant = JSStyleParser.fontVariant(fontVariant))
        }

        return style
    }
}
