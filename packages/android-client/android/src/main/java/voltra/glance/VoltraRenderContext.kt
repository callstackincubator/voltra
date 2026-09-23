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
    // AppWidget. On API 31 and below, Glance's lazy lists need a widget id bound through
    // AppWidgetHost to fetch their items, which a preview can't provide, so LazyColumn and
    // LazyVerticalGrid switch to an eager rendering fallback there (see
    // VoltraLazyListFallback.kt).
    val isPreview: Boolean = false,
)

val LocalVoltraRenderContext =
    compositionLocalOf<VoltraRenderContext> {
        error("VoltraRenderContext not provided")
    }
