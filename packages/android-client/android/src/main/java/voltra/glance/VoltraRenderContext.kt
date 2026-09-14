package voltra.glance

import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.unit.DpSize
import voltra.models.VoltraNode
import java.util.concurrent.atomic.AtomicReference

data class VoltraRenderContext(
    val widgetId: String,
    val sharedElements: List<VoltraNode>? = null,
    val sharedStyles: List<Map<String, Any?>>? = null,
    val widgetSize: DpSize? = null,
    /** The element whose `appWidgetBackground` modifier won; Glance fails the widget on a second one. */
    val appWidgetBackgroundOwner: AtomicReference<Any?> = AtomicReference(null),
) {
    /** True for the first element to ask, and again for that same element on recomposition. */
    fun claimAppWidgetBackground(owner: Any): Boolean =
        appWidgetBackgroundOwner.compareAndSet(null, owner) || appWidgetBackgroundOwner.get() === owner
}

val LocalVoltraRenderContext =
    compositionLocalOf<VoltraRenderContext> {
        error("VoltraRenderContext not provided")
    }
