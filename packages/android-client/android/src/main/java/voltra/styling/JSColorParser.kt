package voltra.styling

import android.util.Log
import androidx.compose.ui.graphics.Color

/**
 * Parses JavaScript color values into Compose Color.
 * Mirrors iOS JSColorParser.swift - supports hex, rgb, rgba, hsl, hsla, and named colors.
 */
object JSColorParser {
    private const val TAG = "JSColorParser"

    /**
     * Parse color value from any format.
     * Supports: hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba, hsl/hsla, named colors.
     */
    fun parse(value: Any?): VoltraColorValue? {
        val string = value?.toString()?.trim()?.lowercase() ?: return null

        if (string.isEmpty()) return null

        VoltraThemeColorRole.fromToken(string)?.let { role ->
            return VoltraColorValue.Dynamic(role)
        }

        // 1. Hex colors (with or without #)
        if (string.startsWith("#")) {
            return parseHex(string)?.let { VoltraColorValue.Static(it) }
        }

        // Check for hex without # prefix (6 or 8 hex digits)
        if (isHexColor(string)) {
            return parseHex("#$string")?.let { VoltraColorValue.Static(it) }
        }

        // 2. RGB/RGBA
        if (string.startsWith("rgb")) {
            return parseRGB(string)?.let { VoltraColorValue.Static(it) }
        }

        // 3. HSL/HSLA
        if (string.startsWith("hsl")) {
            return parseHSL(string)?.let { VoltraColorValue.Static(it) }
        }

        // 4. Named colors
        return parseNamedColor(string)?.let { VoltraColorValue.Static(it) }
    }

    /**
     * Check if string is valid hex color (6 or 8 hex digits).
     */
    private fun isHexColor(string: String): Boolean {
        if (string.length != 6 && string.length != 8) return false
        return string.all { it in '0'..'9' || it in 'a'..'f' }
    }

    /**
     * Parse hex color: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
     */
    private fun parseHex(hex: String): Color? {
        return try {
            val hexSanitized = hex.removePrefix("#")
            val length = hexSanitized.length

            val rgb: Long = hexSanitized.toLong(16)

            val (r, g, b, a) =
                when (length) {
                    3 -> { // #RGB
                        val red = ((rgb shr 8) and 0xF) / 15.0
                        val green = ((rgb shr 4) and 0xF) / 15.0
                        val blue = (rgb and 0xF) / 15.0
                        listOf(red, green, blue, 1.0)
                    }

                    4 -> { // #RGBA
                        val red = ((rgb shr 12) and 0xF) / 15.0
                        val green = ((rgb shr 8) and 0xF) / 15.0
                        val blue = ((rgb shr 4) and 0xF) / 15.0
                        val alpha = (rgb and 0xF) / 15.0
                        listOf(red, green, blue, alpha)
                    }

                    6 -> { // #RRGGBB
                        val red = ((rgb shr 16) and 0xFF) / 255.0
                        val green = ((rgb shr 8) and 0xFF) / 255.0
                        val blue = (rgb and 0xFF) / 255.0
                        listOf(red, green, blue, 1.0)
                    }

                    8 -> { // #RRGGBBAA
                        val red = ((rgb shr 24) and 0xFF) / 255.0
                        val green = ((rgb shr 16) and 0xFF) / 255.0
                        val blue = ((rgb shr 8) and 0xFF) / 255.0
                        val alpha = (rgb and 0xFF) / 255.0
                        listOf(red, green, blue, alpha)
                    }

                    else -> {
                        return null
                    }
                }

            Color(
                red = r.toFloat(),
                green = g.toFloat(),
                blue = b.toFloat(),
                alpha = a.toFloat(),
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse hex color: $hex", e)
            null
        }
    }

    /**
     * Parse RGB/RGBA:
     * - rgb(255, 0, 0), rgba(255, 0, 0, 0.5)
     * - rgb(255 0 0 / 80%), rgba(255 0 0 / 0.8)
     */
    private fun parseRGB(string: String): Color? {
        return try {
            val function = parseFunctionCall(string, setOf("rgb", "rgba")) ?: return null
            val parsed =
                if (function.arguments.contains(",")) {
                    parseRGBCommaSyntax(function.arguments)
                } else {
                    parseRGBSpaceSyntax(function.arguments)
                } ?: return null

            Color(
                red = (parsed.r / 255.0).toFloat(),
                green = (parsed.g / 255.0).toFloat(),
                blue = (parsed.b / 255.0).toFloat(),
                alpha = parsed.a.toFloat(),
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse RGB color: $string", e)
            null
        }
    }

    /**
     * Parse HSL/HSLA:
     * - hsl(120, 100%, 50%), hsla(120, 100%, 50%, 0.5)
     * - hsl(120 100% 50% / 30%), hsla(120 100% 50% / 0.3)
     */
    private fun parseHSL(string: String): Color? {
        return try {
            val function = parseFunctionCall(string, setOf("hsl", "hsla")) ?: return null
            val parsed =
                if (function.arguments.contains(",")) {
                    parseHSLCommaSyntax(function.arguments)
                } else {
                    parseHSLSpaceSyntax(function.arguments)
                } ?: return null

            val (r, g, b) = hslToRgb(parsed.h / 360.0, parsed.s / 100.0, parsed.l / 100.0)

            Color(
                red = r.toFloat(),
                green = g.toFloat(),
                blue = b.toFloat(),
                alpha = parsed.a.toFloat(),
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse HSL color: $string", e)
            null
        }
    }

    /**
     * Convert HSL to RGB.
     * @param h Hue (0.0 to 1.0)
     * @param s Saturation (0.0 to 1.0)
     * @param l Lightness (0.0 to 1.0)
     * @return RGB triple with values from 0.0 to 1.0
     */
    private fun hslToRgb(
        h: Double,
        s: Double,
        l: Double,
    ): Triple<Double, Double, Double> {
        // Achromatic case (no saturation)
        if (s == 0.0) {
            return Triple(l, l, l)
        }

        val q = if (l < 0.5) l * (1 + s) else l + s - l * s
        val p = 2 * l - q

        val r = hueToRgb(p, q, h + 1.0 / 3.0)
        val g = hueToRgb(p, q, h)
        val b = hueToRgb(p, q, h - 1.0 / 3.0)

        return Triple(r, g, b)
    }

    /**
     * Helper function for HSL to RGB conversion.
     */
    private fun hueToRgb(
        p: Double,
        q: Double,
        tInput: Double,
    ): Double {
        var t = tInput
        if (t < 0) t += 1
        if (t > 1) t -= 1

        return when {
            t < 1.0 / 6.0 -> p + (q - p) * 6 * t
            t < 1.0 / 2.0 -> q
            t < 2.0 / 3.0 -> p + (q - p) * (2.0 / 3.0 - t) * 6
            else -> p
        }
    }

    private data class FunctionCall(
        val name: String,
        val arguments: String,
    )

    private data class RgbaComponents(
        val r: Double,
        val g: Double,
        val b: Double,
        val a: Double,
    )

    private data class HslaComponents(
        val h: Double,
        val s: Double,
        val l: Double,
        val a: Double,
    )

    private fun parseFunctionCall(
        string: String,
        allowedNames: Set<String>,
    ): FunctionCall? {
        val open = string.indexOf('(')
        if (open <= 0 || !string.endsWith(")")) return null
        val name = string.substring(0, open).trim().lowercase()
        if (name !in allowedNames) return null
        return FunctionCall(name, string.substring(open + 1, string.length - 1).trim())
    }

    private fun parseRGBCommaSyntax(arguments: String): RgbaComponents? {
        val parts = arguments.split(",").map { it.trim() }
        if (parts.size !in 3..4) return null
        return RgbaComponents(
            r = parseRgbChannel(parts[0]) ?: return null,
            g = parseRgbChannel(parts[1]) ?: return null,
            b = parseRgbChannel(parts[2]) ?: return null,
            a = parts.getOrNull(3)?.let { parseAlpha(it) } ?: 1.0,
        )
    }

    private fun parseRGBSpaceSyntax(arguments: String): RgbaComponents? {
        val sections = arguments.split("/", limit = 2).map { it.trim() }
        val channels = sections[0].split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (channels.size != 3) return null
        return RgbaComponents(
            r = parseRgbChannel(channels[0]) ?: return null,
            g = parseRgbChannel(channels[1]) ?: return null,
            b = parseRgbChannel(channels[2]) ?: return null,
            a = sections.getOrNull(1)?.let { parseAlpha(it) } ?: 1.0,
        )
    }

    private fun parseHSLCommaSyntax(arguments: String): HslaComponents? {
        val parts = arguments.split(",").map { it.trim() }
        if (parts.size !in 3..4) return null
        return HslaComponents(
            h = parseHue(parts[0]) ?: return null,
            s = parsePercentage(parts[1]) ?: return null,
            l = parsePercentage(parts[2]) ?: return null,
            a = parts.getOrNull(3)?.let { parseAlpha(it) } ?: 1.0,
        )
    }

    private fun parseHSLSpaceSyntax(arguments: String): HslaComponents? {
        val sections = arguments.split("/", limit = 2).map { it.trim() }
        val channels = sections[0].split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (channels.size != 3) return null
        return HslaComponents(
            h = parseHue(channels[0]) ?: return null,
            s = parsePercentage(channels[1]) ?: return null,
            l = parsePercentage(channels[2]) ?: return null,
            a = sections.getOrNull(1)?.let { parseAlpha(it) } ?: 1.0,
        )
    }

    private fun parseRgbChannel(token: String): Double? {
        val trimmed = token.trim()
        return if (trimmed.endsWith("%")) {
            parsePercentage(trimmed)?.let { it * 255.0 / 100.0 }
        } else {
            trimmed.toDoubleOrNull()
        }
    }

    private fun parseHue(token: String): Double? {
        val trimmed = token.trim()
        return when {
            trimmed.endsWith("deg") -> trimmed.dropLast(3).toDoubleOrNull()
            trimmed.endsWith("rad") -> trimmed.dropLast(3).toDoubleOrNull()?.let { it * 180.0 / Math.PI }
            trimmed.endsWith("turn") -> trimmed.dropLast(4).toDoubleOrNull()?.let { it * 360.0 }
            else -> trimmed.toDoubleOrNull()
        }
    }

    private fun parsePercentage(token: String): Double? {
        val trimmed = token.trim()
        if (!trimmed.endsWith("%")) return null
        return trimmed.dropLast(1).toDoubleOrNull()
    }

    private fun parseAlpha(token: String): Double? {
        val trimmed = token.trim()
        return if (trimmed.endsWith("%")) {
            trimmed.dropLast(1).toDoubleOrNull()?.let { it / 100.0 }
        } else {
            trimmed.toDoubleOrNull()
        }
    }

    /**
     * Parse named color strings.
     * Supports common CSS/React Native color names.
     */
    private fun parseNamedColor(name: String): Color? =
        when (name) {
            "red" -> Color.Red
            "orange" -> Color(0xFFFFA500)
            "yellow" -> Color.Yellow
            "green" -> Color.Green
            "mint" -> Color(0xFF00FF7F)
            "teal" -> Color(0xFF008080)
            "cyan" -> Color.Cyan
            "blue" -> Color.Blue
            "indigo" -> Color(0xFF4B0082)
            "purple" -> Color(0xFF800080)
            "pink" -> Color(0xFFFFC0CB)
            "brown" -> Color(0xFFA52A2A)
            "white" -> Color.White
            "gray", "grey" -> Color.Gray
            "black" -> Color.Black
            "clear", "transparent" -> Color.Transparent
            "lightgray", "lightgrey" -> Color.LightGray
            "darkgray", "darkgrey" -> Color.DarkGray
            else -> null
        }
}
