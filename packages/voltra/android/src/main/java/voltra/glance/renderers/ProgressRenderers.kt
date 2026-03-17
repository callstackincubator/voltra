package voltra.glance.renderers

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.CircularProgressIndicator
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.appwidget.ProgressIndicatorDefaults
import androidx.glance.unit.ColorProvider
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.styling.JSColorParser

@Composable
fun RenderLinearProgress(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val (baseModifier, _) = resolveAndApplyStyle(element.p, context.sharedStyles)
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: baseModifier,
            element.p,
            element.i,
            context.widgetId,
            element.t,
            element.hashCode(),
        )

    val progress = (element.p?.get("progress") as? Number)?.toFloat()

    val colorProp = element.p?.get("color") as? String
    val backgroundColorProp = element.p?.get("backgroundColor") as? String

    val parsedColor = colorProp?.let { JSColorParser.parse(it) }
    val color =
        if (parsedColor !=
            null
        ) {
            ColorProvider(parsedColor)
        } else {
            ProgressIndicatorDefaults.IndicatorColorProvider
        }

    val parsedBgColor = backgroundColorProp?.let { JSColorParser.parse(it) }
    val backgroundColor =
        if (parsedBgColor !=
            null
        ) {
            ColorProvider(parsedBgColor)
        } else {
            ProgressIndicatorDefaults.BackgroundColorProvider
        }

    if (progress != null) {
        // Determinate progress - preserves value across updates
        LinearProgressIndicator(
            progress = progress.coerceIn(0f, 1f),
            modifier = finalModifier,
            color = color,
            backgroundColor = backgroundColor,
        )
    } else {
        // Indeterminate progress - animation will reset on each update
        LinearProgressIndicator(
            modifier = finalModifier,
            color = color,
            backgroundColor = backgroundColor,
        )
    }
}

@Composable
fun RenderCircularProgress(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val (baseModifier, _) = resolveAndApplyStyle(element.p, context.sharedStyles)
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: baseModifier,
            element.p,
            element.i,
            context.widgetId,
            element.t,
            element.hashCode(),
        )

    val circularColorProp = element.p?.get("color") as? String
    val parsedCircularColor = circularColorProp?.let { JSColorParser.parse(it) }
    val circularColor =
        if (parsedCircularColor !=
            null
        ) {
            ColorProvider(parsedCircularColor)
        } else {
            ProgressIndicatorDefaults.IndicatorColorProvider
        }

    // Note: Glance's CircularProgressIndicator only supports indeterminate mode
    // Animation will reset on each notification update - this is a platform limitation
    CircularProgressIndicator(
        modifier = finalModifier,
        color = circularColor,
    )
}
