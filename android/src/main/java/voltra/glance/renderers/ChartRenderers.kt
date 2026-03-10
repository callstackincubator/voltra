package voltra.glance.renderers

import android.graphics.drawable.Icon
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.layout.ContentScale
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.width
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.styling.JSColorParser
import voltra.styling.SizeValue

private const val TAG = "ChartRenderers"

private const val DEFAULT_CHART_WIDTH_DP = 300
private const val DEFAULT_CHART_HEIGHT_DP = 200
private const val MAX_BITMAP_PIXELS = 600

@Composable
fun RenderChart(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val renderContext = LocalVoltraRenderContext.current
    val (baseModifier, _) = resolveAndApplyStyle(element.p, renderContext.sharedStyles)
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: baseModifier,
            element.p,
            element.i,
            renderContext.widgetId,
            element.t,
            element.hashCode(),
        )

    val marksJson = element.p?.get("marks") as? String
    if (marksJson.isNullOrEmpty()) {
        Log.w(TAG, "Chart element has no marks data")
        return
    }

    val marks = parseMarksJson(marksJson)
    if (marks.isEmpty()) {
        Log.w(TAG, "Chart element has no valid marks after parsing")
        return
    }

    val foregroundStyleScale = parseForegroundStyleScale(element.p?.get("foregroundStyleScale") as? String)

    val xAxisVisible = (element.p?.get("xAxisVisibility") as? String) != "hidden"
    val yAxisVisible = (element.p?.get("yAxisVisibility") as? String) != "hidden"
    val xAxisGridVisible = element.p?.get("xAxisGridVisible") != false
    val yAxisGridVisible = element.p?.get("yAxisGridVisible") != false

    val (_, compositeStyle) = resolveAndApplyStyle(element.p, renderContext.sharedStyles)
    val styleWidth = compositeStyle?.layout?.width
    val styleHeight = compositeStyle?.layout?.height

    val widthIsFill = styleWidth is SizeValue.Fill
    val heightIsFill = styleHeight is SizeValue.Fill
    val hasSectors = marks.any { it.type == "sector" }
    val defaultWidth =
        if (hasSectors && heightIsFill &&
            widthIsFill
        ) {
            DEFAULT_CHART_HEIGHT_DP
        } else {
            DEFAULT_CHART_WIDTH_DP
        }
    val chartWidthDp =
        when (styleWidth) {
            is SizeValue.Fixed -> styleWidth.value.value.toInt()
            else -> defaultWidth
        }
    val chartHeightDp =
        when (styleHeight) {
            is SizeValue.Fixed -> styleHeight.value.value.toInt()
            else -> DEFAULT_CHART_HEIGHT_DP
        }

    val scale =
        (MAX_BITMAP_PIXELS.toFloat() / maxOf(chartWidthDp, chartHeightDp).coerceAtLeast(1))
            .coerceAtMost(1.5f)
    val bitmapWidth = (chartWidthDp * scale).toInt().coerceAtLeast(1)
    val bitmapHeight = (chartHeightDp * scale).toInt().coerceAtLeast(1)

    val bitmap =
        renderChartBitmap(
            marks = marks,
            width = bitmapWidth,
            height = bitmapHeight,
            foregroundStyleScale = foregroundStyleScale,
            xAxisVisible = xAxisVisible,
            yAxisVisible = yAxisVisible,
            xAxisGridVisible = xAxisGridVisible,
            yAxisGridVisible = yAxisGridVisible,
            dpScale = scale,
        )

    var sizeModifier = finalModifier
    sizeModifier =
        sizeModifier.then(
            when {
                widthIsFill -> GlanceModifier.fillMaxWidth()
                else -> GlanceModifier.width(chartWidthDp.dp)
            },
        )
    sizeModifier =
        sizeModifier.then(
            when {
                heightIsFill -> GlanceModifier.fillMaxHeight()
                else -> GlanceModifier.height(chartHeightDp.dp)
            },
        )

    val icon = Icon.createWithBitmap(bitmap)

    Image(
        provider = ImageProvider(icon),
        contentDescription = "Chart",
        contentScale = if (hasSectors) ContentScale.Fit else ContentScale.FillBounds,
        modifier = sizeModifier,
    )
}

private fun parseForegroundStyleScale(json: String?): Map<String, Int>? {
    if (json.isNullOrEmpty()) return null
    return try {
        val gson = com.google.gson.Gson()
        val type = object : com.google.gson.reflect.TypeToken<List<List<String>>>() {}.type
        val pairs: List<List<String>> = gson.fromJson(json, type)
        val map = mutableMapOf<String, Int>()
        for (pair in pairs) {
            if (pair.size >= 2) {
                val color = JSColorParser.parse(pair[1])
                if (color != null) {
                    map[pair[0]] = color.toArgb()
                }
            }
        }
        if (map.isEmpty()) null else map
    } catch (e: Exception) {
        Log.w(TAG, "Failed to parse foregroundStyleScale", e)
        null
    }
}
