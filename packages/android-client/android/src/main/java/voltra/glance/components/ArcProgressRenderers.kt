package voltra.glance.components

import android.content.Context
import android.graphics.Paint
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.appwidget.ProgressIndicatorDefaults
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.ContentScale
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.width
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.renderers.RenderNode
import voltra.glance.renderers.arc.ArcBitmapCache
import voltra.glance.renderers.arc.ArcSpec
import voltra.glance.renderers.arc.resolveArcSize
import voltra.glance.renderers.parseColorStringList
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.styling.JSColorParser
import voltra.styling.SizeValue
import voltra.styling.resolveColor

internal const val DEFAULT_ARC_PROGRESS = 0f
internal const val DEFAULT_ARC_STROKE_WIDTH_DP = 8f
internal const val DEFAULT_ARC_START_ANGLE = 135f
internal const val DEFAULT_ARC_SWEEP_ANGLE = 270f

/**
 * The geometry props of an arc progress indicator, with the documented defaults applied.
 *
 * Split out of the composable so the defaults and the clamping can be tested without a
 * composition.
 */
internal data class ArcGeometry(
    val progress: Float,
    val strokeWidthDp: Float,
    val startAngle: Float,
    val sweepAngle: Float,
    val cap: Paint.Cap,
)

internal fun readArcGeometry(props: Map<String, Any?>?): ArcGeometry =
    ArcGeometry(
        progress = ((props?.get("progress") as? Number)?.toFloat() ?: DEFAULT_ARC_PROGRESS).coerceIn(0f, 1f),
        strokeWidthDp =
            ((props?.get("strokeWidth") as? Number)?.toFloat() ?: DEFAULT_ARC_STROKE_WIDTH_DP)
                .coerceAtLeast(0f),
        startAngle = (props?.get("startAngle") as? Number)?.toFloat() ?: DEFAULT_ARC_START_ANGLE,
        sweepAngle = (props?.get("sweepAngle") as? Number)?.toFloat() ?: DEFAULT_ARC_SWEEP_ANGLE,
        cap =
            when (props?.get("lineCap") as? String) {
                "butt" -> Paint.Cap.BUTT
                else -> Paint.Cap.ROUND
            },
    )

/**
 * Renders an arc progress indicator: a bitmap-drawn partial ring with the element's children
 * centered on top of it.
 *
 * Colors are resolved here, while the composition is still available, so dynamic and day/night
 * colors work. The bitmap itself is produced by the Glance-agnostic `renderers.arc` package.
 */
@Composable
fun RenderArcProgressIndicator(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val renderContext = LocalVoltraRenderContext.current
    val (baseModifier, compositeStyle) = resolveAndApplyStyle(element.p, renderContext.sharedStyles)
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: baseModifier,
            element.p,
            element.i,
            renderContext.widgetId,
            element.t,
            element.hashCode(),
        )

    val context = LocalContext.current
    val props = element.p
    val geometry = readArcGeometry(props)

    val colorArgb =
        resolveArgb(props?.get("color") as? String, context)
            ?: ProgressIndicatorDefaults.IndicatorColorProvider.getColor(context).toArgb()
    val trackColorArgb =
        resolveArgb(props?.get("trackColor") as? String, context)
            ?: ProgressIndicatorDefaults.BackgroundColorProvider.getColor(context).toArgb()
    val gradientColorsArgb = resolveGradientColors(props?.get("gradientColors") as? String, context)

    val styleWidth = compositeStyle?.layout?.width
    val styleHeight = compositeStyle?.layout?.height
    val arcSize =
        resolveArcSize(
            width = styleWidth,
            height = styleHeight,
            widgetSize = renderContext.widgetSize,
            density = context.resources.displayMetrics.density,
        )

    val spec =
        ArcSpec(
            sizePx = arcSize.sizePx,
            progress = geometry.progress,
            startAngle = geometry.startAngle,
            sweepAngle = geometry.sweepAngle,
            strokePx = geometry.strokeWidthDp * arcSize.scale,
            cap = geometry.cap,
            colorArgb = colorArgb,
            trackColorArgb = trackColorArgb,
            gradientColorsArgb = gradientColorsArgb,
        )

    val bitmap = ArcBitmapCache.get(spec)

    // The image fills the box, so an axis the style leaves unsized would collapse to nothing.
    // Give those axes the resolved edge, which is what the default size exists for.
    //
    // A weighted child is left entirely alone: weight expands the parent's main axis with its own
    // size modifier, and a renderer cannot tell whether the parent is a Row or a Column, so
    // setting either axis here could override it.
    val hasWeight = (compositeStyle?.layout?.weight ?: 0f) > 0f
    var sizedModifier = finalModifier
    if (!hasWeight) {
        if (!isSized(styleWidth)) {
            sizedModifier = sizedModifier.then(GlanceModifier.width(arcSize.requestedDp.dp))
        }
        if (!isSized(styleHeight)) {
            sizedModifier = sizedModifier.then(GlanceModifier.height(arcSize.requestedDp.dp))
        }
    }

    Box(
        modifier = sizedModifier,
        contentAlignment = Alignment.Center,
    ) {
        // ImageProvider(bitmap) rather than Icon.createWithBitmap: only Bitmap-typed actions are
        // counted against the widget's bitmap budget and deduplicated by RemoteViews.BitmapCache.
        Image(
            provider = ImageProvider(bitmap),
            contentDescription = "Progress indicator",
            contentScale = ContentScale.Fit,
            modifier = GlanceModifier.fillMaxSize(),
        )
        RenderNode(element.c)
    }
}

private fun isSized(size: SizeValue?): Boolean = size is SizeValue.Fixed || size is SizeValue.Fill

@Composable
private fun resolveArgb(
    value: String?,
    context: Context,
): Int? {
    if (value.isNullOrEmpty()) return null
    return JSColorParser.parse(value)?.resolveColor(context)?.toArgb()
}

/**
 * Resolves the gradient color list. An entry that cannot be parsed drops the whole gradient, so
 * the arc falls back to the solid `color` instead of silently rendering different stops.
 */
@Composable
private fun resolveGradientColors(
    json: String?,
    context: Context,
): List<Int> {
    val values = parseColorStringList(json) ?: return emptyList()
    val resolved = values.map { resolveArgb(it, context) }
    return if (resolved.any { it == null }) emptyList() else resolved.filterNotNull()
}
