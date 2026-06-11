package voltra.styling

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

object JSGradientParser {
    private data class ColorStopToken(
        val color: VoltraColorValue,
        val firstPosition: Float?,
        val secondPosition: Float?,
    )

    private data class IntermediateStop(
        val color: VoltraColorValue,
        val position: Float?,
    )

    private data class ResolvedStop(
        val color: VoltraColorValue,
        val position: Float,
    )

    fun parse(input: String): BackgroundImageValue? {
        val raw = input.trim()
        if (raw.isEmpty()) return null

        val lower = raw.lowercase()
        if (lower.startsWith("repeating-linear-gradient(") ||
            lower.startsWith("repeating-radial-gradient(") ||
            lower.startsWith("repeating-conic-gradient(")
        ) {
            return null
        }

        return when {
            lower.startsWith("linear-gradient(") -> parseLinear(raw)
            lower.startsWith("radial-gradient(") -> parseRadial(raw)
            lower.startsWith("conic-gradient(") -> parseConic(raw)
            else -> null
        }
    }

    private fun parseLinear(value: String): BackgroundImageValue? {
        val content = extractContent(value, "linear-gradient(") ?: return null
        val args = splitGradientArgs(content)
        if (args.size < 2) return null

        var startPoint = UnitPoint(0.5f, 0f)
        var endPoint = UnitPoint(0.5f, 1f)
        var stopArgs = args

        val first = args.first().trim()
        if (first.lowercase().startsWith("to ")) {
            val points = parseLinearDirection(first) ?: return null
            startPoint = points.first
            endPoint = points.second
            stopArgs = args.drop(1)
        } else {
            val angle = parseAngle(first)
            if (angle != null) {
                val points = angleToPoints(angle)
                startPoint = points.first
                endPoint = points.second
                stopArgs = args.drop(1)
            }
        }

        val stops = parseStops(stopArgs, GradientKind.LINEAR) ?: return null
        return BackgroundImageValue.LinearGradient(startPoint, endPoint, stops)
    }

    private fun parseRadial(value: String): BackgroundImageValue? {
        val content = extractContent(value, "radial-gradient(") ?: return null
        val args = splitGradientArgs(content)
        if (args.size < 2) return null

        var shape = RadialGradientShape.ELLIPSE
        var extent = RadialGradientExtent.FARTHEST_CORNER
        var center = UnitPoint.Center
        var stopArgs = args

        val first = args.first()
        if (parseColorStop(first, GradientKind.RADIAL) == null) {
            val prelude = parseRadialPrelude(first) ?: return null
            shape = prelude.shape
            extent = prelude.extent
            center = prelude.center
            stopArgs = args.drop(1)
        }

        val stops = parseStops(stopArgs, GradientKind.RADIAL) ?: return null
        return BackgroundImageValue.RadialGradient(center, shape, extent, stops)
    }

    private fun parseConic(value: String): BackgroundImageValue? {
        val content = extractContent(value, "conic-gradient(") ?: return null
        val args = splitGradientArgs(content)
        if (args.size < 2) return null

        var center = UnitPoint.Center
        var angle = 0f
        var stopArgs = args

        val first = args.first()
        if (parseColorStop(first, GradientKind.CONIC) == null) {
            val prelude = parseConicPrelude(first) ?: return null
            angle = prelude.angleDegrees
            center = prelude.center
            stopArgs = args.drop(1)
        }

        val stops = parseStops(stopArgs, GradientKind.CONIC) ?: return null
        return BackgroundImageValue.ConicGradient(center, angle, stops)
    }

    fun extractContent(
        value: String,
        prefix: String,
    ): String? {
        val trimmed = value.trim()
        val lower = trimmed.lowercase()
        if (!lower.startsWith(prefix) || !trimmed.endsWith(")")) return null
        return trimmed.substring(prefix.length, trimmed.length - 1)
    }

    fun splitGradientArgs(content: String): List<String> {
        val args = mutableListOf<String>()
        val current = StringBuilder()
        var depth = 0

        for (char in content) {
            when (char) {
                '(' -> {
                    depth += 1
                }

                ')' -> {
                    depth -= 1
                    if (depth < 0) return emptyList()
                }
            }

            if (char == ',' && depth == 0) {
                val token = current.toString().trim()
                if (token.isEmpty()) return emptyList()
                args.add(token)
                current.clear()
            } else {
                current.append(char)
            }
        }

        if (depth != 0) return emptyList()
        val token = current.toString().trim()
        if (token.isEmpty()) return emptyList()
        args.add(token)
        return args
    }

    private fun splitByWhitespaceOutsideParentheses(value: String): List<String> {
        val result = mutableListOf<String>()
        val current = StringBuilder()
        var depth = 0

        for (char in value) {
            when (char) {
                '(' -> {
                    depth += 1
                }

                ')' -> {
                    depth -= 1
                    if (depth < 0) return emptyList()
                }
            }

            if (char.isWhitespace() && depth == 0) {
                val token = current.toString().trim()
                if (token.isNotEmpty()) result.add(token)
                current.clear()
            } else {
                current.append(char)
            }
        }

        if (depth != 0) return emptyList()
        val tail = current.toString().trim()
        if (tail.isNotEmpty()) result.add(tail)
        return result
    }

    private fun parseLinearDirection(value: String): Pair<UnitPoint, UnitPoint>? {
        val lower = value.lowercase().trim()
        if (!lower.startsWith("to ")) return null
        val words = lower.removePrefix("to ").split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (words.isEmpty() || words.size > 2) return null

        var horizontal: String? = null
        var vertical: String? = null
        for (word in words) {
            when (word) {
                "left", "right" -> {
                    if (horizontal != null) return null
                    horizontal = word
                }

                "top", "bottom" -> {
                    if (vertical != null) return null
                    vertical = word
                }

                else -> {
                    return null
                }
            }
        }

        val endX =
            when (horizontal) {
                "left" -> 0f
                "right" -> 1f
                else -> 0.5f
            }
        val endY =
            when (vertical) {
                "top" -> 0f
                "bottom" -> 1f
                else -> 0.5f
            }
        return UnitPoint(1f - endX, 1f - endY) to UnitPoint(endX, endY)
    }

    private fun angleToPoints(angleDegrees: Float): Pair<UnitPoint, UnitPoint> {
        val radians = (angleDegrees - 90f) * PI.toFloat() / 180f
        val x = cos(radians)
        val y = sin(radians)
        return UnitPoint(0.5f - x / 2f, 0.5f + y / 2f) to
            UnitPoint(0.5f + x / 2f, 0.5f - y / 2f)
    }

    private data class RadialPrelude(
        val shape: RadialGradientShape,
        val extent: RadialGradientExtent,
        val center: UnitPoint,
    )

    private fun parseRadialPrelude(value: String): RadialPrelude? {
        val tokens = splitByWhitespaceOutsideParentheses(value.lowercase())
        if (tokens.isEmpty()) return null

        var shape = RadialGradientShape.ELLIPSE
        var extent = RadialGradientExtent.FARTHEST_CORNER
        var center = UnitPoint.Center
        var idx = 0

        while (idx < tokens.size) {
            val token = tokens[idx]
            when {
                token == "at" -> {
                    val positionTokens = tokens.drop(idx + 1)
                    if (positionTokens.isEmpty()) return null
                    center = parsePosition(positionTokens) ?: return null
                    idx = tokens.size
                }

                token == "circle" -> {
                    shape = RadialGradientShape.CIRCLE
                    idx += 1
                }

                token == "ellipse" -> {
                    shape = RadialGradientShape.ELLIPSE
                    idx += 1
                }

                else -> {
                    extent = parseRadialExtent(token) ?: return null
                    idx += 1
                }
            }
        }

        return RadialPrelude(shape, extent, center)
    }

    private fun parseRadialExtent(token: String): RadialGradientExtent? =
        when (token) {
            "closest-side" -> RadialGradientExtent.CLOSEST_SIDE
            "farthest-side" -> RadialGradientExtent.FARTHEST_SIDE
            "closest-corner" -> RadialGradientExtent.CLOSEST_CORNER
            "farthest-corner" -> RadialGradientExtent.FARTHEST_CORNER
            else -> null
        }

    private data class ConicPrelude(
        val angleDegrees: Float,
        val center: UnitPoint,
    )

    private fun parseConicPrelude(value: String): ConicPrelude? {
        val tokens = splitByWhitespaceOutsideParentheses(value.lowercase())
        if (tokens.isEmpty()) return null

        var angle = 0f
        var center = UnitPoint.Center
        var hasFrom = false
        var hasAt = false
        var idx = 0

        while (idx < tokens.size) {
            val token = tokens[idx]
            when (token) {
                "from" -> {
                    if (hasFrom || idx + 1 >= tokens.size) return null
                    angle = parseAngle(tokens[idx + 1]) ?: return null
                    hasFrom = true
                    idx += 2
                }

                "at" -> {
                    if (hasAt) return null
                    val positionTokens = tokens.drop(idx + 1)
                    if (positionTokens.isEmpty()) return null
                    center = parsePosition(positionTokens) ?: return null
                    hasAt = true
                    idx = tokens.size
                }

                else -> {
                    return null
                }
            }
        }

        return ConicPrelude(angle, center)
    }

    private fun parsePosition(tokens: List<String>): UnitPoint? {
        if (tokens.isEmpty() || tokens.size > 2) return null
        if (tokens.size == 1) {
            return when (tokens[0]) {
                "center" -> UnitPoint.Center
                "left" -> UnitPoint(0f, 0.5f)
                "right" -> UnitPoint(1f, 0.5f)
                "top" -> UnitPoint(0.5f, 0f)
                "bottom" -> UnitPoint(0.5f, 1f)
                else -> null
            }
        }

        var x: Float? = null
        var y: Float? = null
        for (token in tokens) {
            when (token) {
                "left" -> {
                    if (x != null) return null
                    x = 0f
                }

                "right" -> {
                    if (x != null) return null
                    x = 1f
                }

                "center" -> {
                    if (x == null) {
                        x = 0.5f
                    } else if (y == null) {
                        y = 0.5f
                    } else {
                        return null
                    }
                }

                "top" -> {
                    if (y != null) return null
                    y = 0f
                }

                "bottom" -> {
                    if (y != null) return null
                    y = 1f
                }

                else -> {
                    return null
                }
            }
        }
        return UnitPoint(x ?: 0.5f, y ?: 0.5f)
    }

    private fun parseStops(
        args: List<String>,
        kind: GradientKind,
    ): List<GradientStop>? {
        val tokens = args.map { parseColorStop(it, kind) ?: return null }
        if (tokens.size < 2) return null

        val expanded =
            tokens.flatMap { stop ->
                buildList {
                    add(IntermediateStop(stop.color, stop.firstPosition))
                    if (stop.secondPosition != null) add(IntermediateStop(stop.color, stop.secondPosition))
                }
            }
        val resolved = resolveStopPositions(expanded)
        if (resolved.size < 2) return null
        return resolved.map { GradientStop(it.color, it.position) }
    }

    private fun parseColorStop(
        token: String,
        kind: GradientKind,
    ): ColorStopToken? {
        val trimmed = token.trim()
        if (trimmed.isEmpty()) return null

        splitFunctionColorAndPositions(trimmed)?.let { split ->
            JSColorParser.parse(split.colorToken)?.let { color ->
                val positions =
                    split.positionTokens.map { positionToken ->
                        parseStopPosition(positionToken, kind) ?: return null
                    }
                return ColorStopToken(color, positions.firstOrNull(), positions.getOrNull(1))
            }
        }

        splitColorAndPositions(trimmed, kind)?.let { split ->
            JSColorParser.parse(split.colorToken)?.let { color ->
                val positions =
                    split.positionTokens.map { positionToken ->
                        parseStopPosition(positionToken, kind) ?: return null
                    }
                return ColorStopToken(color, positions.firstOrNull(), positions.getOrNull(1))
            }
        }

        return JSColorParser.parse(trimmed)?.let { ColorStopToken(it, null, null) }
    }

    private data class ColorPositionSplit(
        val colorToken: String,
        val positionTokens: List<String>,
    )

    private fun splitFunctionColorAndPositions(token: String): ColorPositionSplit? {
        val lower = token.lowercase()
        if (!listOf("rgba(", "rgb(", "hsla(", "hsl(").any { lower.startsWith(it) }) return null

        var depth = 0
        var closeIndex = -1
        for (idx in token.indices) {
            when (token[idx]) {
                '(' -> {
                    depth += 1
                }

                ')' -> {
                    depth -= 1
                    if (depth == 0) {
                        closeIndex = idx
                        break
                    }
                    if (depth < 0) return null
                }
            }
        }
        if (closeIndex < 0) return null

        val colorToken = token.substring(0, closeIndex + 1).trim()
        val rest = token.substring(closeIndex + 1).trim()
        if (rest.isEmpty()) return ColorPositionSplit(colorToken, emptyList())

        val positionTokens = splitByWhitespaceOutsideParentheses(rest)
        if (positionTokens.isEmpty() || positionTokens.size > 2) return null
        return ColorPositionSplit(colorToken, positionTokens)
    }

    private fun splitColorAndPositions(
        token: String,
        kind: GradientKind,
    ): ColorPositionSplit? {
        val parts = splitByWhitespaceOutsideParentheses(token)
        if (parts.size < 2) return null

        if (parts.size >= 3) {
            val colorToken = parts.dropLast(2).joinToString(" ").trim()
            val positions = parts.takeLast(2)
            if (colorToken.isNotEmpty() && positions.all { parseStopPosition(it, kind) != null }) {
                return ColorPositionSplit(colorToken, positions)
            }
        }

        val colorToken = parts.dropLast(1).joinToString(" ").trim()
        val positions = parts.takeLast(1)
        if (colorToken.isNotEmpty() && positions.all { parseStopPosition(it, kind) != null }) {
            return ColorPositionSplit(colorToken, positions)
        }

        return null
    }

    private fun parseStopPosition(
        token: String,
        kind: GradientKind,
    ): Float? {
        val lower = token.lowercase()
        if (lower.endsWith("%")) {
            return lower.dropLast(1).toFloatOrNull()?.let { it / 100f }
        }
        if (kind == GradientKind.CONIC) {
            return parseAngle(lower)?.let { it / 360f }
        }
        return null
    }

    private fun resolveStopPositions(stops: List<IntermediateStop>): List<ResolvedStop> {
        if (stops.isEmpty()) return emptyList()

        val positions = stops.map { it.position }.toMutableList()
        if (positions.first() == null) positions[0] = 0f
        if (positions.last() == null) positions[positions.lastIndex] = 1f

        var lastDefined: Float? = null
        for (idx in positions.indices) {
            val current = positions[idx]
            if (current != null) {
                val adjusted = lastDefined?.let { previous -> current.coerceAtLeast(previous) } ?: current
                positions[idx] = adjusted
                lastDefined = adjusted
            }
        }

        var index = 0
        while (index < positions.size) {
            if (positions[index] != null) {
                index += 1
                continue
            }

            val start = index - 1
            var end = index
            while (end < positions.size && positions[end] == null) {
                end += 1
            }
            if (start < 0 || end >= positions.size) return emptyList()
            val startPos = positions[start] ?: return emptyList()
            val endPos = positions[end] ?: return emptyList()
            val gaps = end - start
            for (step in 1 until gaps) {
                val t = step.toFloat() / gaps.toFloat()
                positions[start + step] = startPos + (endPos - startPos) * t
            }
            index = end + 1
        }

        return stops.mapIndexedNotNull { idx, stop ->
            positions[idx]?.let { ResolvedStop(stop.color, it) }
        }
    }

    private fun parseAngle(token: String): Float? {
        val trimmed = token.trim().lowercase()
        return when {
            trimmed.endsWith("deg") -> trimmed.dropLast(3).toFloatOrNull()
            trimmed.endsWith("rad") -> trimmed.dropLast(3).toFloatOrNull()?.let { it * 180f / PI.toFloat() }
            trimmed.endsWith("turn") -> trimmed.dropLast(4).toFloatOrNull()?.let { it * 360f }
            else -> null
        }
    }
}
