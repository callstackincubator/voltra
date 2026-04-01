package voltra.glance

import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.unit.DpSize
import voltra.models.VoltraNode

data class VoltraRenderContext(
    val widgetId: String,
    val sharedElements: List<VoltraNode>? = null,
    val sharedStyles: List<Map<String, Any>>? = null,
    val widgetSize: DpSize? = null,
)

val LocalVoltraRenderContext =
    compositionLocalOf<VoltraRenderContext> {
        error("VoltraRenderContext not provided")
    }
