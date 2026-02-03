package voltra.glance.renderers

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.appwidget.components.Scaffold
import androidx.glance.appwidget.components.TitleBar
import androidx.glance.text.FontFamily
import androidx.glance.unit.ColorProvider
import com.google.gson.Gson
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.payload.ComponentTypeID
import voltra.styling.JSColorParser

private const val TAG = "ComplexRenderers"
private val gson = Gson()

@Composable
fun RenderTitleBar(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalContext.current
    val renderContext = LocalVoltraRenderContext.current
    val (computedModifier, _) = resolveAndApplyStyle(element.p, renderContext.sharedStyles)
    val modifierWithClickable =
        applyClickableIfNeeded(
            computedModifier,
            element.p,
            element.i,
            renderContext.widgetId,
            element.t,
            element.hashCode(),
        )
    val finalModifier = modifier ?: modifierWithClickable

    val title = (element.p?.get("title") as? String) ?: ""
    val startIcon = extractImageProvider(element.p?.get("startIcon")) ?: ImageProvider(android.R.drawable.ic_menu_add)

    val textColor =
        element.p?.get("textColor")?.let {
            JSColorParser.parse(it as String)?.let { color ->
                ColorProvider(color)
            }
        } ?: androidx.glance.GlanceTheme.colors.onSurface

    val iconColor =
        element.p?.get("iconColor")?.let {
            JSColorParser.parse(it as String)?.let { color ->
                ColorProvider(color)
            }
        } ?: androidx.glance.GlanceTheme.colors.onSurface

    val fontFamilyString = element.p?.get("fontFamily") as? String
    val fontFamily =
        if (fontFamilyString != null) {
            when (fontFamilyString) {
                "monospace" -> FontFamily.Monospace
                "serif" -> FontFamily.Serif
                "sans-serif" -> FontFamily.SansSerif
                "cursive" -> FontFamily.Cursive
                else -> null
            }
        } else {
            null
        }

    TitleBar(
        startIcon = startIcon,
        title = title,
        textColor = textColor,
        iconColor = iconColor,
        modifier = finalModifier,
        fontFamily = fontFamily,
    ) {
        RenderNode(element.c)
    }
}

@Composable
fun RenderScaffold(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val renderContext = LocalVoltraRenderContext.current
    val (computedModifier, _) = resolveAndApplyStyle(element.p, renderContext.sharedStyles)
    val modifierWithClickable =
        applyClickableIfNeeded(
            computedModifier,
            element.p,
            element.i,
            renderContext.widgetId,
            element.t,
            element.hashCode(),
        )
    val finalModifier = modifier ?: modifierWithClickable

    val backgroundColor =
        element.p?.get("backgroundColor")?.let {
            JSColorParser.parse(it as String)?.let { color ->
                ColorProvider(color)
            }
        } ?: androidx.glance.GlanceTheme.colors.widgetBackground

    val horizontalPadding = (element.p?.get("horizontalPadding") as? Number)?.toFloat()?.dp ?: 12.dp

    // Find titleBar element and body content separately
    val (titleBarNode, bodyNode) = extractScaffoldChildren(element.c, renderContext)

    Scaffold(
        modifier = finalModifier,
        backgroundColor = backgroundColor,
        horizontalPadding = horizontalPadding,
        titleBar = {
            if (titleBarNode != null) {
                RenderNode(titleBarNode)
            }
        },
    ) {
        if (bodyNode != null) {
            RenderNode(bodyNode)
        }
    }
}

private fun extractScaffoldChildren(
    children: VoltraNode?,
    context: voltra.glance.VoltraRenderContext,
): Pair<VoltraNode?, VoltraNode?> =
    when (children) {
        is VoltraNode.Array -> {
            val titleBar =
                children.elements.find { child ->
                    when (child) {
                        is VoltraNode.Element -> {
                            child.element.t == ComponentTypeID.TITLE_BAR
                        }

                        is VoltraNode.Ref -> {
                            val resolved = context.sharedElements?.getOrNull(child.ref)
                            resolved is VoltraNode.Element && resolved.element.t == ComponentTypeID.TITLE_BAR
                        }

                        else -> {
                            false
                        }
                    }
                }

            val bodyElements =
                children.elements.filter { child ->
                    when (child) {
                        is VoltraNode.Element -> {
                            child.element.t != ComponentTypeID.TITLE_BAR
                        }

                        is VoltraNode.Ref -> {
                            val resolved = context.sharedElements?.getOrNull(child.ref)
                            !(resolved is VoltraNode.Element && resolved.element.t == ComponentTypeID.TITLE_BAR)
                        }

                        else -> {
                            true
                        }
                    }
                }
            val body = if (bodyElements.isNotEmpty()) VoltraNode.Array(bodyElements) else null

            titleBar to body
        }

        is VoltraNode.Element -> {
            if (children.element.t == ComponentTypeID.TITLE_BAR) {
                children to null
            } else {
                null to children
            }
        }

        else -> {
            null to children
        }
    }
