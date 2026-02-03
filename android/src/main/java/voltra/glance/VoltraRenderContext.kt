package voltra.glance

import androidx.compose.runtime.compositionLocalOf
import voltra.models.VoltraNode

data class VoltraRenderContext(
    val widgetId: String,
    val sharedElements: List<VoltraNode>? = null,
    val sharedStyles: List<Map<String, Any>>? = null,
)

val LocalVoltraRenderContext =
    compositionLocalOf<VoltraRenderContext> {
        error("VoltraRenderContext not provided")
    }
