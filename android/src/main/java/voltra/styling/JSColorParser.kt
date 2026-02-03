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
    fun parse(value: Any?): Color? {
        val string = value?.toString()?.trim()?.lowercase() ?: return null

        if (string.isEmpty()) return null

        // 1. Hex colors (with or without #)
        if (string.startsWith("#")) {
            return parseHex(string)
        }

        // Check for hex without # prefix (6 or 8 hex digits)
        if (isHexColor(string)) {
            return parseHex("#$string")
        }

        // 2. RGB/RGBA
        if (string.startsWith("rgb")) {
            return parseRGB(string)
        }

        // 3. HSL/HSLA
        if (string.startsWith("hsl")) {
            return parseHSL(string)
        }

        // 4. Named colors
        return parseNamedColor(string)
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
     * Parse RGB/RGBA: rgb(255, 0, 0) or rgba(255, 0, 0, 0.5)
     */
    private fun parseRGB(string: String): Color? {
        return try {
            val cleaned =
                string
                    .replace("rgba", "")
                    .replace("rgb", "")
                    .replace("(", "")
                    .replace(")", "")
                    .replace(" ", "")

            val components = cleaned.split(",")
            if (components.size < 3) return null

            val r = components[0].toDouble()
            val g = components[1].toDouble()
            val b = components[2].toDouble()
            val a = if (components.size >= 4) components[3].toDouble() else 1.0

            Color(
                red = (r / 255.0).toFloat(),
                green = (g / 255.0).toFloat(),
                blue = (b / 255.0).toFloat(),
                alpha = a.toFloat(),
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse RGB color: $string", e)
            null
        }
    }

    /**
     * Parse HSL/HSLA: hsl(120, 100%, 50%) or hsla(...)
     */
    private fun parseHSL(string: String): Color? {
        return try {
            val cleaned =
                string
                    .replace("hsla", "")
                    .replace("hsl", "")
                    .replace("(", "")
                    .replace(")", "")
                    .replace(" ", "")
                    .replace("%", "")

            val components = cleaned.split(",")
            if (components.size < 3) return null

            val h = (components[0].toDouble()) / 360.0
            val s = (components[1].toDouble()) / 100.0
            val l = (components[2].toDouble()) / 100.0
            val a = if (components.size >= 4) components[3].toDouble() else 1.0

            val (r, g, b) = hslToRgb(h, s, l)

            Color(
                red = r.toFloat(),
                green = g.toFloat(),
                blue = b.toFloat(),
                alpha = a.toFloat(),
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
