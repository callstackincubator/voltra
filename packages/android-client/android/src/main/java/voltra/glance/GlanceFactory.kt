package voltra.glance

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.unit.DpSize
import voltra.glance.renderers.RenderNode
import voltra.models.VoltraNode
import voltra.modifiers.LocalVoltraModifierRenderState
import voltra.modifiers.VoltraModifierRenderState

class GlanceFactory(
    private val widgetId: String,
    private val sharedElements: List<VoltraNode>? = null,
    private val sharedStyles: List<Map<String, Any?>>? = null,
    private val widgetSize: DpSize? = null,
) {
    @Composable
    fun Render(node: VoltraNode?) {
        val context = VoltraRenderContext(widgetId, sharedElements, sharedStyles, widgetSize)
        // Decided from the whole tree before rendering, so no element depends on render order.
        val modifierRenderState = VoltraModifierRenderState.forTree(node, sharedElements)
        CompositionLocalProvider(
            LocalVoltraRenderContext provides context,
            LocalVoltraModifierRenderState provides modifierRenderState,
        ) {
            RenderNode(node)
        }
    }
}
