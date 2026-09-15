package voltra.glance

import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.unit.DpSize
import voltra.models.VoltraNode

data class VoltraRenderContext(
    val widgetId: String,
    val sharedElements: List<VoltraNode>? = null,
    val sharedStyles: List<Map<String, Any?>>? = null,
    val widgetSize: DpSize? = null,
    // True when this tree is being composed for VoltraWidgetPreview rather than a real
    // AppWidget. Used to switch lazy list components (LazyColumn / LazyVerticalGrid) to an
    // eager rendering fallback on API levels where their collection adapters can't bind
    // without a real AppWidget host (see VoltraLazyListFallback.kt).
    val isPreview: Boolean = false,
)

val LocalVoltraRenderContext =
    compositionLocalOf<VoltraRenderContext> {
        error("VoltraRenderContext not provided")
    }
