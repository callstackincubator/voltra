package voltra.glance.renderers

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.glance.ButtonDefaults
import androidx.glance.GlanceModifier
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.appwidget.components.CircleIconButton
import androidx.glance.appwidget.components.FilledButton
import androidx.glance.appwidget.components.OutlineButton
import androidx.glance.appwidget.components.SquareIconButton
import androidx.glance.layout.Box
import androidx.glance.unit.ColorProvider
import com.google.gson.Gson
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.styling.JSColorParser

private const val TAG = "ButtonRenderers"
private val gson = Gson()

@Composable
fun RenderButton(
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

    Box(modifier = finalModifier) {
        RenderNode(element.c)
    }
}

@Composable
fun RenderFilledButton(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val computedModifier = modifier ?: resolveAndApplyStyle(element.p, context.sharedStyles).modifier

    val componentId = element.i ?: "button_${element.hashCode()}"
    val text = (element.p?.get("text") as? String) ?: ""
    val enabled = (element.p?.get("enabled") as? Boolean) ?: true
    val maxLines = (element.p?.get("maxLines") as? Number)?.toInt() ?: Int.MAX_VALUE
    val icon = extractImageProvider(element.p?.get("icon"))

    val backgroundColor = element.p?.get("backgroundColor") as? String
    val contentColor = element.p?.get("contentColor") as? String

    val colors =
        if (backgroundColor != null && contentColor != null) {
            val bg = JSColorParser.parse(backgroundColor)
            val fg = JSColorParser.parse(contentColor)
            if (bg != null && fg != null) {
                ButtonDefaults.buttonColors(
                    backgroundColor = ColorProvider(bg),
                    contentColor = ColorProvider(fg),
                )
            } else {
                ButtonDefaults.buttonColors()
            }
        } else {
            ButtonDefaults.buttonColors()
        }

    FilledButton(
        text = text,
        onClick = getOnClickAction(LocalContext.current, element.p, context.widgetId, componentId),
        modifier = computedModifier,
        enabled = enabled,
        icon = icon.takeIf { element.p?.containsKey("icon") == true }, // Only pass icon if present
        colors = colors,
        maxLines = maxLines,
    )
}

@Composable
fun RenderOutlineButton(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val computedModifier = modifier ?: resolveAndApplyStyle(element.p, context.sharedStyles).modifier

    val componentId = element.i ?: "button_${element.hashCode()}"
    val text = (element.p?.get("text") as? String) ?: extractTextFromNode(element.c)
    val enabled = (element.p?.get("enabled") as? Boolean) ?: true
    val maxLines = (element.p?.get("maxLines") as? Number)?.toInt() ?: Int.MAX_VALUE
    val icon = extractImageProvider(element.p?.get("icon"))

    val contentColorProp = element.p?.get("contentColor") as? String
    val contentColor =
        if (contentColorProp != null) {
            JSColorParser.parse(contentColorProp)?.let { ColorProvider(it) } ?: ColorProvider(Color.Black)
        } else {
            ColorProvider(Color.Black)
        }

    OutlineButton(
        text = text,
        contentColor = contentColor,
        onClick = getOnClickAction(LocalContext.current, element.p, context.widgetId, componentId),
        modifier = computedModifier,
        enabled = enabled,
        icon = icon.takeIf { element.p?.containsKey("icon") == true },
        maxLines = maxLines,
    )
}

@Composable
fun RenderCircleIconButton(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val computedModifier = modifier ?: resolveAndApplyStyle(element.p, context.sharedStyles).modifier

    val componentId = element.i ?: "button_${element.hashCode()}"
    val contentDescription = (element.p?.get("contentDescription") as? String) ?: ""
    val imageProvider = extractImageProvider(element.p?.get("icon")) ?: ImageProvider(android.R.drawable.ic_menu_add)
    val enabled = (element.p?.get("enabled") as? Boolean) ?: true

    val backgroundColorProp = element.p?.get("backgroundColor") as? String
    val contentColorProp = element.p?.get("contentColor") as? String

    val backgroundColor =
        if (backgroundColorProp != null) {
            JSColorParser.parse(backgroundColorProp)?.let { ColorProvider(it) }
        } else {
            androidx.glance.GlanceTheme.colors.background
        }

    val contentColor =
        if (contentColorProp != null) {
            JSColorParser.parse(contentColorProp)?.let { ColorProvider(it) }
        } else {
            androidx.glance.GlanceTheme.colors.onSurface
        }

    CircleIconButton(
        imageProvider = imageProvider,
        contentDescription = contentDescription,
        onClick = getOnClickAction(LocalContext.current, element.p, context.widgetId, componentId),
        modifier = computedModifier,
        enabled = enabled,
        backgroundColor = backgroundColor,
        contentColor = contentColor ?: androidx.glance.GlanceTheme.colors.onSurface,
    )
}

@Composable
fun RenderSquareIconButton(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val computedModifier = modifier ?: resolveAndApplyStyle(element.p, context.sharedStyles).modifier

    val componentId = element.i ?: "button_${element.hashCode()}"
    val contentDescription = (element.p?.get("contentDescription") as? String) ?: ""
    val imageProvider = extractImageProvider(element.p?.get("icon")) ?: ImageProvider(android.R.drawable.ic_menu_add)
    val enabled = (element.p?.get("enabled") as? Boolean) ?: true

    val backgroundColorProp = element.p?.get("backgroundColor") as? String
    val contentColorProp = element.p?.get("contentColor") as? String

    val backgroundColor =
        if (backgroundColorProp != null) {
            JSColorParser.parse(backgroundColorProp)?.let { ColorProvider(it) }
        } else {
            androidx.glance.GlanceTheme.colors.primary
        }

    val contentColor =
        if (contentColorProp != null) {
            JSColorParser.parse(contentColorProp)?.let { ColorProvider(it) }
        } else {
            androidx.glance.GlanceTheme.colors.onPrimary
        }

    SquareIconButton(
        imageProvider = imageProvider,
        contentDescription = contentDescription,
        onClick = getOnClickAction(LocalContext.current, element.p, context.widgetId, componentId),
        modifier = computedModifier,
        enabled = enabled,
        backgroundColor = backgroundColor ?: androidx.glance.GlanceTheme.colors.primary,
        contentColor = contentColor ?: androidx.glance.GlanceTheme.colors.onPrimary,
    )
}

private fun extractTextFromNode(node: voltra.models.VoltraNode?): String =
    when (node) {
        is voltra.models.VoltraNode.Text -> {
            node.text
        }

        is voltra.models.VoltraNode.Array -> {
            node.elements.filterIsInstance<voltra.models.VoltraNode.Text>().joinToString("") { it.text }
        }

        else -> {
            ""
        }
    }
