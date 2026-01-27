package voltra.glance.renderers

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.LocalContext
import androidx.glance.text.Text
import com.google.gson.Gson
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.ResolvedStyle
import voltra.glance.applyClickableIfNeeded
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.styling.toGlanceTextStyle

private const val TAG = "TextAndImageRenderers"
private val gson = Gson()

@Composable
fun RenderText(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
    compositeStyle: voltra.styling.CompositeStyle? = null,
) {
    val context = LocalVoltraRenderContext.current
    val baseModifier = modifier ?: resolveAndApplyStyle(element.p, context.sharedStyles).modifier
    val finalModifier =
        applyClickableIfNeeded(
            baseModifier,
            element.p,
            element.i,
            context.widgetId,
            element.t,
            element.hashCode(),
        )

    val resolvedStyle =
        if (compositeStyle != null) {
            compositeStyle
        } else {
            resolveAndApplyStyle(element.p, context.sharedStyles).compositeStyle
        }

    val text = extractTextFromNode(element.c)
    val textStyle = resolvedStyle?.text?.toGlanceTextStyle() ?: androidx.glance.text.TextStyle()

    Text(text = text, modifier = finalModifier, style = textStyle)
}

@Composable
fun RenderImage(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val renderContext = LocalVoltraRenderContext.current
    val baseModifier = modifier ?: resolveAndApplyStyle(element.p, renderContext.sharedStyles).modifier
    val finalModifier =
        applyClickableIfNeeded(
            baseModifier,
            element.p,
            element.i,
            renderContext.widgetId,
            element.t,
            element.hashCode(),
        )

    val contentDescription = element.p?.get("contentDescription") as? String
    val contentScale =
        parseContentScale(
            (element.p?.get("contentScale") as? String) ?: (element.p?.get("resizeMode") as? String),
        )
    val alpha = (element.p?.get("alpha") as? Number)?.toFloat() ?: 1.0f

    val tintColorString = element.p?.get("tintColor") as? String
    val colorFilter =
        if (tintColorString != null) {
            voltra.styling.JSColorParser.parse(tintColorString)?.let {
                androidx.glance.ColorFilter.tint(androidx.glance.unit.ColorProvider(it))
            }
        } else {
            null
        }

    val imageProvider = extractImageProvider(element.p?.get("source"))

    if (imageProvider != null) {
        Image(
            provider = imageProvider,
            contentDescription = contentDescription,
            modifier = finalModifier,
            contentScale = contentScale,
            colorFilter = colorFilter,
            alpha = alpha,
        )
    } else {
        androidx.glance.layout.Box(modifier = finalModifier) {}
    }
}

private fun extractTextFromNode(node: VoltraNode?): String =
    when (node) {
        is VoltraNode.Text -> {
            node.text
        }

        is VoltraNode.Array -> {
            node.elements.filterIsInstance<VoltraNode.Text>().joinToString("") { it.text }
        }

        else -> {
            ""
        }
    }
