package voltra.glance.renderers

import android.graphics.drawable.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.background
import androidx.glance.layout.ContentScale
import androidx.glance.layout.height
import androidx.glance.layout.width
import androidx.glance.text.Text
import androidx.glance.unit.ColorProvider
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.models.componentProp
import voltra.styling.JSColorParser
import voltra.styling.VoltraColorValue
import voltra.styling.resolveColor
import voltra.styling.toColorProvider
import voltra.styling.toGlanceTextStyle

@Composable
fun RenderText(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
    compositeStyle: voltra.styling.CompositeStyle? = null,
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

    val resolvedStyle =
        if (compositeStyle != null) {
            compositeStyle
        } else {
            resolveAndApplyStyle(element.p, renderContext.sharedStyles).compositeStyle
        }

    val text: String = (element.p?.get("text") as? String) ?: extractTextFromNode(element.c)
    val renderAsBitmap = element.p?.get("renderAsBitmap") as? Boolean ?: false
    val textStyle = resolvedStyle?.text ?: voltra.styling.TextStyle.Default

    if (renderAsBitmap && textStyle.fontFamily != null) {
        val context = LocalContext.current
        val density = context.resources.displayMetrics.density
        val isBold =
            textStyle.fontWeight?.let {
                it == androidx.glance.text.FontWeight.Bold
            } ?: false
        val typeface = loadTypeface(context, textStyle.fontFamily, isBold)

        if (typeface != null) {
            val bitmapTextStyle =
                textStyle.copy(
                    color = textStyle.color?.let { VoltraColorValue.Static(it.resolveColor(context)) },
                )
            // Use screen width as max constraint
            val maxWidthPx = (context.resources.displayMetrics.widthPixels * 0.9f).toInt()
            val bitmap =
                renderTextBitmap(
                    context = context,
                    text = text,
                    textStyle = bitmapTextStyle,
                    typeface = typeface,
                    maxWidthPx = maxWidthPx,
                )
            val icon = Icon.createWithBitmap(bitmap)
            val widthDp = (bitmap.width / density).toInt()
            val heightDp = (bitmap.height / density).toInt()
            Image(
                provider = ImageProvider(icon),
                contentDescription = text,
                contentScale = ContentScale.Fit,
                modifier =
                    finalModifier
                        .width(widthDp.dp)
                        .height(heightDp.dp),
            )
            return
        }
    }

    val glanceTextStyle = textStyle.toGlanceTextStyle()
    Text(text = text, modifier = finalModifier, style = glanceTextStyle)
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
                androidx.glance.ColorFilter.tint(it.toColorProvider())
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
        val fallbackNode =
            element.componentProp(
                "fallback",
                renderContext.sharedStyles,
                renderContext.sharedElements,
            )

        if (fallbackNode != null) {
            androidx.glance.layout.Box(modifier = finalModifier) {
                RenderNode(fallbackNode)
            }
        } else {
            androidx.glance.layout.Box(modifier = finalModifier) {}
        }
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
