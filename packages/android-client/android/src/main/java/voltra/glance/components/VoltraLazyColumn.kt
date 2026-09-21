package voltra.glance.components

import android.os.Build
import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.renderers.RenderNode
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement

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
    val horizontalAlignment = extractHorizontalAlignment(element.p)
    val items = resolveLazyListItems(element.c, context.sharedElements)

    // On API 31 and below, Glance delivers LazyColumn's items through GlanceRemoteViewsService,
    // which the framework binds via AppWidgetManager.bindRemoteViewsService — that requires a
    // real widget id bound to the caller's AppWidgetHost, which no in-app preview can provide
    // (see VoltraRN.kt). Render the items eagerly there instead so the preview shows content.
    if (context.isPreview && Build.VERSION.SDK_INT <= Build.VERSION_CODES.S) {
        logPreviewApproximation("LazyColumn")
        Column(
            modifier = finalModifier,
            horizontalAlignment = horizontalAlignment,
        ) {
            RenderNestedGroups(items, horizontalAlignment) { child ->
                LazyItemBox(horizontalAlignment) { RenderNode(child) }
            }
        }
        return
    }

    LazyColumn(
        modifier = finalModifier,
        horizontalAlignment = horizontalAlignment,
    ) {
        items(items.size) { index ->
            RenderNode(items[index])
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
