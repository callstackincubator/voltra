package voltra.glance

import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.unit.DpSize
import voltra.models.VoltraNode

data class VoltraRenderContext(
    val widgetId: String,
    val sharedElements: List<VoltraNode>? = null,
    val sharedStyles: List<Map<String, Any?>>? = null,
    val widgetSize: DpSize? = null,
    // True when LazyColumn and LazyVerticalGrid must render their items eagerly as a Column,
    // because Glance's lazy lists can't fetch items in this host (see VoltraRN.kt and
    // VoltraLazyListFallback.kt). VoltraRN decides this once for VoltraWidgetPreview.
    val eagerLazyLists: Boolean = false,
)

val LocalVoltraRenderContext =
    compositionLocalOf<VoltraRenderContext> {
        error("VoltraRenderContext not provided")
    }
