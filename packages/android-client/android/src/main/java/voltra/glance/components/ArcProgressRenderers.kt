package voltra.glance.components

import android.content.Context
import android.graphics.Paint
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.toArgb
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.appwidget.ProgressIndicatorDefaults
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.ContentScale
import androidx.glance.layout.fillMaxSize
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
import voltra.styling.resolveColor

private const val DEFAULT_PROGRESS = 0f
private const val DEFAULT_STROKE_WIDTH_DP = 8f
private const val DEFAULT_START_ANGLE = 135f
private const val DEFAULT_SWEEP_ANGLE = 270f

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

    val progress = ((props?.get("progress") as? Number)?.toFloat() ?: DEFAULT_PROGRESS).coerceIn(0f, 1f)
    val strokeWidthDp = (props?.get("strokeWidth") as? Number)?.toFloat() ?: DEFAULT_STROKE_WIDTH_DP
    val startAngle = (props?.get("startAngle") as? Number)?.toFloat() ?: DEFAULT_START_ANGLE
    val sweepAngle = (props?.get("sweepAngle") as? Number)?.toFloat() ?: DEFAULT_SWEEP_ANGLE
    val cap =
        when (props?.get("lineCap") as? String) {
            "butt" -> Paint.Cap.BUTT
            else -> Paint.Cap.ROUND
        }

    val colorArgb =
        resolveArgb(props?.get("color") as? String, context)
            ?: ProgressIndicatorDefaults.IndicatorColorProvider.getColor(context).toArgb()
    val trackColorArgb =
        resolveArgb(props?.get("trackColor") as? String, context)
            ?: ProgressIndicatorDefaults.BackgroundColorProvider.getColor(context).toArgb()
    val gradientColorsArgb =
        parseColorStringList(props?.get("gradientColors") as? String)
            ?.mapNotNull { resolveArgb(it, context) }
            ?: emptyList()

    val arcSize =
        resolveArcSize(
            width = compositeStyle?.layout?.width,
            height = compositeStyle?.layout?.height,
            widgetSize = renderContext.widgetSize,
            density = context.resources.displayMetrics.density,
        )

    val spec =
        ArcSpec(
            sizePx = arcSize.sizePx,
            progress = progress,
            startAngle = startAngle,
            sweepAngle = sweepAngle,
            strokePx = strokeWidthDp.coerceAtLeast(0f) * arcSize.scale,
            cap = cap,
            colorArgb = colorArgb,
            trackColorArgb = trackColorArgb,
            gradientColorsArgb = gradientColorsArgb,
        )

    val bitmap = ArcBitmapCache.get(spec)

    Box(
        modifier = finalModifier,
        contentAlignment = Alignment.Center,
    ) {
        // ImageProvider(bitmap) rather than Icon.createWithBitmap: only Bitmap-typed actions are
        // counted against the widget's bitmap budget and deduplicated by RemoteViews.BitmapCache.
        Image(
            provider = ImageProvider(bitmap),
            contentDescription = null,
            contentScale = ContentScale.Fit,
            modifier = GlanceModifier.fillMaxSize(),
        )
        RenderNode(element.c)
    }
}

@Composable
private fun resolveArgb(
    value: String?,
    context: Context,
): Int? {
    if (value.isNullOrEmpty()) return null
    return JSColorParser.parse(value)?.resolveColor(context)?.toArgb()
}
