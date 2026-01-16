package voltra.glance

import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.layout.*
import androidx.glance.text.Text
import voltra.ComponentRegistry
import voltra.models.*
import voltra.styling.GlanceStyleConverter

class GlanceFactory(
    private val sharedElements: List<VoltraNode>? = null,
    private val sharedStyles: List<Map<String, Any>>? = null
) {
    
    companion object {
        private const val TAG = "GlanceFactory"
    }
    
    @Composable
    fun RenderNode(node: VoltraNode?) {
        when (node) {
            is VoltraNode.Element -> RenderElement(node.element)
            is VoltraNode.Array -> {
                node.elements.forEach { RenderNode(it) }
            }
            is VoltraNode.Ref -> {
                val resolved = sharedElements?.getOrNull(node.ref)
                RenderNode(resolved)
            }
            is VoltraNode.Text -> Text(node.text)
            null -> { /* Empty */ }
        }
    }
    
    @Composable
    private fun RenderElement(element: VoltraElement) {
        val resolvedStyle = resolveStyle(element.p)
        val modifier = GlanceStyleConverter.applyModifier(resolvedStyle)
        
        when (element.t) {
            ComponentRegistry.TEXT -> RenderText(element, modifier, resolvedStyle)
            ComponentRegistry.COLUMN -> RenderColumn(element, modifier)
            ComponentRegistry.ROW -> RenderRow(element, modifier)
            ComponentRegistry.BOX -> RenderBox(element, modifier)
            ComponentRegistry.SPACER -> RenderSpacer(element, modifier)
            ComponentRegistry.IMAGE -> RenderImage(element, modifier)
            ComponentRegistry.BUTTON -> RenderButton(element, modifier)
            ComponentRegistry.LINEAR_PROGRESS -> RenderLinearProgress(element, modifier)
            ComponentRegistry.CIRCULAR_PROGRESS -> RenderCircularProgress(element, modifier)
        }
    }
    
    /**
     * Resolve style reference to actual style map.
     * Props may contain {"s": <index>} where index references sharedStyles array.
     */
    private fun resolveStyle(props: Map<String, Any>?): Map<String, Any>? {
        if (props == null) return null
        
        val styleRef = props["s"]
        return when (styleRef) {
            is Number -> {
                // It's an index into sharedStyles
                val index = styleRef.toInt()
                sharedStyles?.getOrNull(index)
            }
            is Map<*, *> -> {
                // It's already an inline style
                @Suppress("UNCHECKED_CAST")
                styleRef as? Map<String, Any>
            }
            else -> null
        }
    }
    
    @Composable
    private fun RenderText(element: VoltraElement, modifier: GlanceModifier, resolvedStyle: Map<String, Any>?) {
        val text = when (val children = element.c) {
            is VoltraNode.Text -> children.text
            is VoltraNode.Array -> {
                // Concatenate text children
                children.elements.filterIsInstance<VoltraNode.Text>().joinToString("") { it.text }
            }
            else -> ""
        }
        val textStyle = GlanceStyleConverter.buildTextStyle(resolvedStyle)
        Text(text = text, modifier = modifier, style = textStyle)
    }
    
    @Composable
    private fun RenderColumn(element: VoltraElement, modifier: GlanceModifier) {
        Column(
            modifier = modifier,
            verticalAlignment = Alignment.Top,
            horizontalAlignment = Alignment.Start
        ) {
            RenderNode(element.c)
        }
    }
    
    @Composable
    private fun RenderRow(element: VoltraElement, modifier: GlanceModifier) {
        Row(
            modifier = modifier,
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.Start
        ) {
            RenderNode(element.c)
        }
    }
    
    @Composable
    private fun RenderBox(element: VoltraElement, modifier: GlanceModifier) {
        Box(modifier = modifier) {
            RenderNode(element.c)
        }
    }
    
    @Composable
    private fun RenderSpacer(element: VoltraElement, modifier: GlanceModifier) {
        Spacer(modifier = modifier)
    }
    
    @Composable
    private fun RenderImage(element: VoltraElement, modifier: GlanceModifier) {
        // TODO: Handle image source from props
        Box(modifier = modifier) {}
    }
    
    @Composable
    private fun RenderButton(element: VoltraElement, modifier: GlanceModifier) {
        Box(modifier = modifier) {
            RenderNode(element.c)
        }
    }
    
    @Composable
    private fun RenderLinearProgress(element: VoltraElement, modifier: GlanceModifier) {
        val props = element.p
        val progress = (props?.get("progress") as? Number)?.toFloat()
        
        if (progress != null) {
            // Determinate progress - preserves value across updates
            androidx.glance.appwidget.LinearProgressIndicator(
                progress = progress.coerceIn(0f, 1f),
                modifier = modifier
            )
        } else {
            // Indeterminate progress - animation will reset on each update
            androidx.glance.appwidget.LinearProgressIndicator(modifier = modifier)
        }
    }
    
    @Composable
    private fun RenderCircularProgress(element: VoltraElement, modifier: GlanceModifier) {
        // Note: Glance's CircularProgressIndicator only supports indeterminate mode
        // Animation will reset on each notification update - this is a platform limitation
        androidx.glance.appwidget.CircularProgressIndicator(modifier = modifier)
    }
}
