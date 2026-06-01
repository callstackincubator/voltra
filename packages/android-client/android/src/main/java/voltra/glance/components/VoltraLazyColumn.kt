package voltra.glance.components

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.layout.Alignment
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.renderers.RenderNode
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode

@Composable
fun VoltraLazyColumn(
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

    LazyColumn(
        modifier = finalModifier,
        horizontalAlignment = extractHorizontalAlignment(element.p),
    ) {
        when (val children = element.c) {
            is VoltraNode.Array -> {
                items(children.elements.size) { index ->
                    RenderNode(children.elements[index])
                }
            }

            is VoltraNode.Ref -> {
                val resolved = context.sharedElements?.getOrNull(children.ref)
                if (resolved is VoltraNode.Array) {
                    items(resolved.elements.size) { index ->
                        RenderNode(resolved.elements[index])
                    }
                } else {
                    item { RenderNode(resolved) }
                }
            }

            null -> { /* Empty list */ }

            else -> {
                item { RenderNode(children) }
            }
        }
    }
}

internal fun extractHorizontalAlignment(props: Map<String, Any?>?): Alignment.Horizontal =
    when (props?.get("horizontalAlignment") as? String) {
        "start" -> Alignment.Horizontal.Start
        "center-horizontally" -> Alignment.Horizontal.CenterHorizontally
        "end" -> Alignment.Horizontal.End
        else -> Alignment.Horizontal.Start
    }
