package voltra.glance.components

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.CircularProgressIndicator
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.appwidget.ProgressIndicatorDefaults
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.styling.JSColorParser
import voltra.styling.toColorProvider

@Composable
fun RenderLinearProgress(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: resolveAndApplyStyle(element, context.sharedStyles).modifier,
            element.p,
            element.i,
            context.widgetId,
            element.t,
            element.hashCode(),
        )

    val progress = (element.p?.get("progress") as? Number)?.toFloat()

    val parsedColor = JSColorParser.parse(element.p?.get("color"), "color")
    val color =
        if (parsedColor !=
            null
        ) {
            parsedColor.toColorProvider()
        } else {
            ProgressIndicatorDefaults.IndicatorColorProvider
        }

    val parsedBgColor = JSColorParser.parse(element.p?.get("backgroundColor"), "backgroundColor")
    val backgroundColor =
        if (parsedBgColor !=
            null
        ) {
            parsedBgColor.toColorProvider()
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
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: resolveAndApplyStyle(element, context.sharedStyles).modifier,
            element.p,
            element.i,
            context.widgetId,
            element.t,
            element.hashCode(),
        )

    val parsedCircularColor = JSColorParser.parse(element.p?.get("color"), "color")
    val circularColor =
        if (parsedCircularColor !=
            null
        ) {
            parsedCircularColor.toColorProvider()
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
