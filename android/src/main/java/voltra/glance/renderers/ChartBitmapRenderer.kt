package voltra.glance.renderers

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.Log
import androidx.compose.ui.graphics.toArgb
import voltra.styling.JSColorParser

private const val TAG = "ChartBitmapRenderer"

private val DEFAULT_PALETTE =
    intArrayOf(
        0xFF4E79A7.toInt(), // blue
        0xFFF28E2B.toInt(), // orange
        0xFFE15759.toInt(), // red
        0xFF76B7B2.toInt(), // teal
        0xFF59A14F.toInt(), // green
        0xFFEDC948.toInt(), // yellow
        0xFFB07AA1.toInt(), // purple
        0xFFFF9DA7.toInt(), // pink
        0xFF9C755F.toInt(), // brown
        0xFFBAB0AC.toInt(), // grey
    )

data class WireMark(
    val type: String,
    val data: List<List<Any>>?,
    val props: Map<String, Any>,
)

data class ChartPoint(
    val xStr: String?,
    val xNum: Double?,
    val y: Double,
    val series: String?,
)

data class SectorPoint(
    val value: Double,
    val category: String,
)

fun parseMarksJson(marksJson: String): List<WireMark> {
    return try {
        val gson = com.google.gson.Gson()
        val type = object : com.google.gson.reflect.TypeToken<List<List<Any>>>() {}.type
        val outer: List<List<Any>> = gson.fromJson(marksJson, type)
        outer.mapNotNull { row ->
            if (row.size < 3) return@mapNotNull null
            val markType = row[0] as? String ?: return@mapNotNull null

            @Suppress("UNCHECKED_CAST")
            val data = row[1] as? List<List<Any>>

            @Suppress("UNCHECKED_CAST")
            val props = (row[2] as? Map<String, Any>) ?: emptyMap()
            WireMark(markType, data, props)
        }
    } catch (e: Exception) {
        Log.w(TAG, "Failed to parse marks JSON", e)
        emptyList()
    }
}

private fun extractChartPoints(data: List<List<Any>>?): List<ChartPoint> {
    if (data == null) return emptyList()
    return data.map { pt ->
        val y = (pt.getOrNull(1) as? Number)?.toDouble() ?: 0.0
        val series = pt.getOrNull(2) as? String
        val xRaw = pt.getOrNull(0)
        when (xRaw) {
            is String -> ChartPoint(xStr = xRaw, xNum = null, y = y, series = series)
            is Number -> ChartPoint(xStr = null, xNum = xRaw.toDouble(), y = y, series = series)
            else -> ChartPoint(xStr = null, xNum = null, y = y, series = series)
        }
    }
}

private fun extractSectorPoints(data: List<List<Any>>?): List<SectorPoint> {
    if (data == null) return emptyList()
    return data.mapNotNull { pt ->
        val value = (pt.getOrNull(0) as? Number)?.toDouble() ?: return@mapNotNull null
        val category = pt.getOrNull(1) as? String ?: return@mapNotNull null
        SectorPoint(value, category)
    }
}

private fun wireColor(props: Map<String, Any>): Int? {
    val colorStr = props["c"] as? String ?: return null
    return try {
        JSColorParser.parse(colorStr)?.toArgb()
    } catch (_: Exception) {
        null
    }
}

private fun seriesColorMap(
    points: List<ChartPoint>,
    foregroundStyleScale: Map<String, Int>?,
): Map<String?, Int> {
    val map = mutableMapOf<String?, Int>()
    var idx = 0
    for (pt in points) {
        if (pt.series != null && pt.series !in map) {
            val scaleColor = foregroundStyleScale?.get(pt.series)
            map[pt.series] = scaleColor ?: DEFAULT_PALETTE[idx % DEFAULT_PALETTE.size]
            idx++
        }
    }
    return map
}

fun renderChartBitmap(
    marks: List<WireMark>,
    width: Int,
    height: Int,
    foregroundStyleScale: Map<String, Int>? = null,
    xAxisVisible: Boolean = true,
    yAxisVisible: Boolean = true,
    dpScale: Float = 1f,
): Bitmap {
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(0x00000000)

    val paddingLeft = if (yAxisVisible) 48f else 16f
    val paddingBottom = if (xAxisVisible) 40f else 16f
    val paddingTop = 16f
    val paddingRight = 16f

    val chartLeft = paddingLeft
    val chartTop = paddingTop
    val chartRight = width - paddingRight
    val chartBottom = height - paddingBottom
    val chartWidth = chartRight - chartLeft
    val chartHeight = chartBottom - chartTop

    if (chartWidth <= 0 || chartHeight <= 0) return bitmap

    val allPoints = marks.flatMap { extractChartPoints(it.data) }
    val hasSectors = marks.any { it.type == "sector" }

    if (hasSectors) {
        for (m in marks) {
            if (m.type == "sector") {
                drawSector(canvas, m, width, height, foregroundStyleScale, dpScale)
            }
        }
        return bitmap
    }

    if (allPoints.isEmpty() && marks.none { it.type == "rule" }) return bitmap

    val hasStringX = allPoints.any { it.xStr != null }
    val categories: List<String> =
        if (hasStringX) {
            allPoints.mapNotNull { it.xStr }.distinct()
        } else {
            emptyList()
        }

    val xMin: Double
    val xMax: Double
    if (hasStringX) {
        xMin = 0.0
        xMax = (categories.size - 1).toDouble().coerceAtLeast(1.0)
    } else {
        val nums = allPoints.mapNotNull { it.xNum }
        xMin = nums.minOrNull() ?: 0.0
        xMax = (nums.maxOrNull() ?: 1.0).let { if (it == xMin) it + 1.0 else it }
    }

    val yValues = allPoints.map { it.y }
    val yMin = (yValues.minOrNull() ?: 0.0).coerceAtMost(0.0)
    val yMax = (yValues.maxOrNull() ?: 1.0).let { if (it == yMin) it + 1.0 else it }

    fun mapX(pt: ChartPoint): Float =
        if (hasStringX) {
            val idx = categories.indexOf(pt.xStr ?: "")
            chartLeft + (idx.toFloat() / (categories.size - 1).coerceAtLeast(1).toFloat()) * chartWidth
        } else {
            chartLeft + ((pt.xNum ?: 0.0).toFloat() - xMin.toFloat()) / (xMax.toFloat() - xMin.toFloat()) * chartWidth
        }

    fun mapY(y: Double): Float =
        chartBottom - ((y.toFloat() - yMin.toFloat()) / (yMax.toFloat() - yMin.toFloat()) * chartHeight)

    val gridPaint =
        Paint().apply {
            color = 0x20808080
            style = Paint.Style.STROKE
            strokeWidth = 1f
            pathEffect = DashPathEffect(floatArrayOf(4f, 4f), 0f)
        }
    val gridSteps = 4
    for (i in 0..gridSteps) {
        val y = chartTop + (chartHeight * i / gridSteps)
        canvas.drawLine(chartLeft, y, chartRight, y, gridPaint)
    }

    val axisPaint =
        Paint().apply {
            color = 0xFF888888.toInt()
            style = Paint.Style.STROKE
            strokeWidth = 1.5f
        }
    if (yAxisVisible) {
        canvas.drawLine(chartLeft, chartTop, chartLeft, chartBottom, axisPaint)
    }
    if (xAxisVisible) {
        canvas.drawLine(chartLeft, chartBottom, chartRight, chartBottom, axisPaint)
    }

    val labelPaint =
        Paint().apply {
            color = 0xFF888888.toInt()
            textSize = 10f * (width / 400f).coerceIn(0.8f, 1.5f)
            isAntiAlias = true
        }

    if (yAxisVisible) {
        for (i in 0..gridSteps) {
            val yVal = yMin + (yMax - yMin) * (gridSteps - i) / gridSteps
            val y = chartTop + (chartHeight * i / gridSteps)
            val label =
                if (yVal == yVal.toLong().toDouble()) {
                    yVal.toLong().toString()
                } else {
                    String.format("%.1f", yVal)
                }
            canvas.drawText(label, 4f, y + labelPaint.textSize / 3, labelPaint)
        }
    }

    if (xAxisVisible && hasStringX) {
        labelPaint.textAlign = Paint.Align.CENTER
        for ((idx, cat) in categories.withIndex()) {
            val x = chartLeft + (idx.toFloat() / (categories.size - 1).coerceAtLeast(1).toFloat()) * chartWidth
            canvas.drawText(cat, x, chartBottom + labelPaint.textSize + 4f, labelPaint)
        }
    }

    for (m in marks) {
        val points = extractChartPoints(m.data)
        val color = wireColor(m.props)

        when (m.type) {
            "bar" -> {
                drawBars(
                    canvas,
                    points,
                    m.props,
                    color,
                    foregroundStyleScale,
                    hasStringX,
                    categories,
                    chartLeft,
                    chartBottom,
                    chartWidth,
                    chartHeight,
                    xMin,
                    xMax,
                    yMin,
                    yMax,
                )
            }

            "line" -> {
                drawLine(
                    canvas,
                    points,
                    m.props,
                    color,
                    foregroundStyleScale,
                    ::mapX,
                    ::mapY,
                )
            }

            "area" -> {
                drawArea(
                    canvas,
                    points,
                    m.props,
                    color,
                    foregroundStyleScale,
                    ::mapX,
                    ::mapY,
                    chartBottom,
                )
            }

            "point" -> {
                drawPoints(
                    canvas,
                    points,
                    m.props,
                    color,
                    foregroundStyleScale,
                    ::mapX,
                    ::mapY,
                )
            }

            "rule" -> {
                drawRule(
                    canvas,
                    m.props,
                    chartLeft,
                    chartRight,
                    chartTop,
                    chartBottom,
                    chartWidth,
                    chartHeight,
                    xMin,
                    xMax,
                    yMin,
                    yMax,
                    hasStringX,
                    categories,
                )
            }
        }
    }

    return bitmap
}

private fun drawBars(
    canvas: Canvas,
    points: List<ChartPoint>,
    props: Map<String, Any>,
    staticColor: Int?,
    foregroundStyleScale: Map<String, Int>?,
    hasStringX: Boolean,
    categories: List<String>,
    chartLeft: Float,
    chartBottom: Float,
    chartWidth: Float,
    chartHeight: Float,
    xMin: Double,
    xMax: Double,
    yMin: Double,
    yMax: Double,
) {
    if (points.isEmpty()) return

    val cornerRadius = (props["cr"] as? Number)?.toFloat() ?: 0f
    val grouped = (props["stk"] as? String) == "grouped"
    val seriesColors = seriesColorMap(points, foregroundStyleScale)
    val seriesList = seriesColors.keys.filterNotNull()
    val seriesCount = seriesList.size.coerceAtLeast(1)

    val barWidthRatio = 0.6f
    val categoryCount = if (hasStringX) categories.size.coerceAtLeast(1) else points.size.coerceAtLeast(1)
    val totalBarSlot = chartWidth / categoryCount
    val barWidth = (props["w"] as? Number)?.toFloat() ?: (totalBarSlot * barWidthRatio)

    val paint =
        Paint().apply {
            style = Paint.Style.FILL
            isAntiAlias = true
        }

    fun yToCanvas(y: Double): Float =
        chartBottom - ((y.toFloat() - yMin.toFloat()) / (yMax.toFloat() - yMin.toFloat()) * chartHeight)

    val zeroY = yToCanvas(0.0.coerceIn(yMin, yMax))

    for ((i, pt) in points.withIndex()) {
        val catIdx = if (hasStringX) categories.indexOf(pt.xStr ?: "") else i
        val cx = chartLeft + (catIdx + 0.5f) * totalBarSlot

        val barX: Float
        if (grouped && pt.series != null) {
            val seriesIdx = seriesList.indexOf(pt.series)
            val groupWidth = barWidth
            val singleWidth = groupWidth / seriesCount
            barX = cx - groupWidth / 2f + seriesIdx * singleWidth
            paint.color = seriesColors[pt.series] ?: staticColor ?: DEFAULT_PALETTE[0]
            val left = barX
            val right = barX + singleWidth
            val top = yToCanvas(pt.y)
            val rect = RectF(left, top.coerceAtMost(zeroY), right, top.coerceAtLeast(zeroY))
            if (cornerRadius > 0) {
                canvas.drawRoundRect(rect, cornerRadius, cornerRadius, paint)
            } else {
                canvas.drawRect(rect, paint)
            }
        } else {
            paint.color =
                if (pt.series != null) {
                    seriesColors[pt.series] ?: staticColor ?: DEFAULT_PALETTE[0]
                } else {
                    staticColor ?: DEFAULT_PALETTE[0]
                }
            val left = cx - barWidth / 2f
            val right = cx + barWidth / 2f
            val top = yToCanvas(pt.y)
            val rect = RectF(left, top.coerceAtMost(zeroY), right, top.coerceAtLeast(zeroY))
            if (cornerRadius > 0) {
                canvas.drawRoundRect(rect, cornerRadius, cornerRadius, paint)
            } else {
                canvas.drawRect(rect, paint)
            }
        }
    }
}

private fun drawLine(
    canvas: Canvas,
    points: List<ChartPoint>,
    props: Map<String, Any>,
    staticColor: Int?,
    foregroundStyleScale: Map<String, Int>?,
    mapX: (ChartPoint) -> Float,
    mapY: (Double) -> Float,
) {
    if (points.isEmpty()) return

    val lineWidth = (props["lw"] as? Number)?.toFloat() ?: 2f
    val seriesColors = seriesColorMap(points, foregroundStyleScale)

    val groups =
        if (seriesColors.isNotEmpty()) {
            points.groupBy { it.series }
        } else {
            mapOf(null as String? to points)
        }

    for ((series, pts) in groups) {
        val sorted = pts.sortedBy { it.xNum ?: 0.0 }
        if (sorted.size < 2) continue

        val paint =
            Paint().apply {
                style = Paint.Style.STROKE
                this.strokeWidth = lineWidth
                isAntiAlias = true
                strokeCap = Paint.Cap.ROUND
                strokeJoin = Paint.Join.ROUND
                color = seriesColors[series] ?: staticColor ?: DEFAULT_PALETTE[0]
            }

        val path = Path()
        path.moveTo(mapX(sorted[0]), mapY(sorted[0].y))
        for (i in 1 until sorted.size) {
            path.lineTo(mapX(sorted[i]), mapY(sorted[i].y))
        }
        canvas.drawPath(path, paint)
    }
}

private fun drawArea(
    canvas: Canvas,
    points: List<ChartPoint>,
    props: Map<String, Any>,
    staticColor: Int?,
    foregroundStyleScale: Map<String, Int>?,
    mapX: (ChartPoint) -> Float,
    mapY: (Double) -> Float,
    baseline: Float,
) {
    if (points.isEmpty()) return

    val seriesColors = seriesColorMap(points, foregroundStyleScale)

    val groups =
        if (seriesColors.isNotEmpty()) {
            points.groupBy { it.series }
        } else {
            mapOf(null as String? to points)
        }

    for ((series, pts) in groups) {
        val sorted = pts.sortedBy { it.xNum ?: 0.0 }
        if (sorted.isEmpty()) continue

        val baseColor = seriesColors[series] ?: staticColor ?: DEFAULT_PALETTE[0]

        val fillPaint =
            Paint().apply {
                style = Paint.Style.FILL
                isAntiAlias = true
                color = (baseColor and 0x00FFFFFF) or 0x40000000
            }

        val fillPath = Path()
        fillPath.moveTo(mapX(sorted[0]), baseline)
        for (pt in sorted) {
            fillPath.lineTo(mapX(pt), mapY(pt.y))
        }
        fillPath.lineTo(mapX(sorted.last()), baseline)
        fillPath.close()
        canvas.drawPath(fillPath, fillPaint)

        val strokePaint =
            Paint().apply {
                style = Paint.Style.STROKE
                strokeWidth = 2f
                isAntiAlias = true
                color = baseColor
            }
        val strokePath = Path()
        strokePath.moveTo(mapX(sorted[0]), mapY(sorted[0].y))
        for (i in 1 until sorted.size) {
            strokePath.lineTo(mapX(sorted[i]), mapY(sorted[i].y))
        }
        canvas.drawPath(strokePath, strokePaint)
    }
}

private fun drawPoints(
    canvas: Canvas,
    points: List<ChartPoint>,
    props: Map<String, Any>,
    staticColor: Int?,
    foregroundStyleScale: Map<String, Int>?,
    mapX: (ChartPoint) -> Float,
    mapY: (Double) -> Float,
) {
    if (points.isEmpty()) return

    val symbolSize = (props["syms"] as? Number)?.toFloat() ?: 24f
    val radius = kotlin.math.sqrt(symbolSize) * 1.2f
    val seriesColors = seriesColorMap(points, foregroundStyleScale)

    val paint =
        Paint().apply {
            style = Paint.Style.FILL
            isAntiAlias = true
        }

    for (pt in points) {
        paint.color = seriesColors[pt.series] ?: staticColor ?: DEFAULT_PALETTE[0]
        canvas.drawCircle(mapX(pt), mapY(pt.y), radius, paint)
    }
}

private fun drawRule(
    canvas: Canvas,
    props: Map<String, Any>,
    chartLeft: Float,
    chartRight: Float,
    chartTop: Float,
    chartBottom: Float,
    chartWidth: Float,
    chartHeight: Float,
    xMin: Double,
    xMax: Double,
    yMin: Double,
    yMax: Double,
    hasStringX: Boolean,
    categories: List<String>,
) {
    val lineWidth = (props["lw"] as? Number)?.toFloat() ?: 1.5f
    val color = wireColor(props) ?: 0xFF888888.toInt()

    val paint =
        Paint().apply {
            style = Paint.Style.STROKE
            strokeWidth = lineWidth
            this.color = color
            isAntiAlias = true
        }

    val yv = (props["yv"] as? Number)?.toDouble()
    val xvStr = props["xv"] as? String
    val xvNum = (props["xv"] as? Number)?.toDouble()

    if (yv != null) {
        val y = chartBottom - ((yv.toFloat() - yMin.toFloat()) / (yMax.toFloat() - yMin.toFloat()) * chartHeight)
        canvas.drawLine(chartLeft, y, chartRight, y, paint)
    } else if (xvStr != null && hasStringX) {
        val idx = categories.indexOf(xvStr)
        if (idx >= 0) {
            val x = chartLeft + (idx.toFloat() / (categories.size - 1).coerceAtLeast(1).toFloat()) * chartWidth
            canvas.drawLine(x, chartTop, x, chartBottom, paint)
        }
    } else if (xvNum != null) {
        val x = chartLeft + ((xvNum.toFloat() - xMin.toFloat()) / (xMax.toFloat() - xMin.toFloat()) * chartWidth)
        canvas.drawLine(x, chartTop, x, chartBottom, paint)
    }
}

private fun drawSector(
    canvas: Canvas,
    mark: WireMark,
    width: Int,
    height: Int,
    foregroundStyleScale: Map<String, Int>?,
    dpScale: Float = 1f,
) {
    val sectors = extractSectorPoints(mark.data)
    if (sectors.isEmpty()) return

    val total = sectors.sumOf { it.value }
    if (total <= 0) return

    val innerRaw = (mark.props["ir"] as? Number)?.toFloat() ?: 0f
    val outerRaw = (mark.props["or"] as? Number)?.toFloat() ?: 1f
    val angularInset = (mark.props["agin"] as? Number)?.toFloat() ?: 1f

    val cx = width / 2f
    val cy = height / 2f
    val maxRadius = minOf(cx, cy) - 8f

    val outerR = if (outerRaw > 1f) (outerRaw * dpScale).coerceAtMost(maxRadius) else maxRadius * outerRaw
    val innerR =
        if (innerRaw >
            1f
        ) {
            (innerRaw * dpScale).coerceAtMost(outerR - 1f).coerceAtLeast(0f)
        } else {
            maxRadius * innerRaw
        }

    val outerRect = RectF(cx - outerR, cy - outerR, cx + outerR, cy + outerR)

    val paint =
        Paint().apply {
            style = Paint.Style.FILL
            isAntiAlias = true
        }

    var startAngle = -90f
    for ((i, sector) in sectors.withIndex()) {
        val sweep = (sector.value / total * 360.0).toFloat()
        paint.color = foregroundStyleScale?.get(sector.category)
            ?: DEFAULT_PALETTE[i % DEFAULT_PALETTE.size]

        if (innerR > 0) {
            val path = Path()
            path.arcTo(outerRect, startAngle + angularInset / 2f, sweep - angularInset)
            val innerRect = RectF(cx - innerR, cy - innerR, cx + innerR, cy + innerR)
            path.arcTo(innerRect, startAngle + sweep - angularInset / 2f, -(sweep - angularInset))
            path.close()
            canvas.drawPath(path, paint)
        } else {
            canvas.drawArc(outerRect, startAngle + angularInset / 2f, sweep - angularInset, true, paint)
        }

        startAngle += sweep
    }
}
