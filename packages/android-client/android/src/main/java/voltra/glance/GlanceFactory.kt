package voltra.glance

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.unit.DpSize
import voltra.glance.renderers.RenderNode
import voltra.models.VoltraNode

class GlanceFactory(
    private val widgetId: String,
    private val sharedElements: List<VoltraNode>? = null,
    private val sharedStyles: List<Map<String, Any?>>? = null,
    private val widgetSize: DpSize? = null,
) {
    @Composable
    fun Render(node: VoltraNode?) {
        val context = VoltraRenderContext(widgetId, sharedElements, sharedStyles, widgetSize)
        CompositionLocalProvider(LocalVoltraRenderContext provides context) {
            RenderNode(node)
        }
    }
}
