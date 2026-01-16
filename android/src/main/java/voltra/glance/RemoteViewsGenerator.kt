package voltra.glance

import android.content.Context
import android.util.Log
import android.widget.RemoteViews
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.ExperimentalGlanceRemoteViewsApi
import androidx.glance.appwidget.GlanceRemoteViews
import voltra.models.VoltraNode
import voltra.models.VoltraPayload

@OptIn(ExperimentalGlanceRemoteViewsApi::class)
object RemoteViewsGenerator {
    
    private const val TAG = "RemoteViewsGenerator"
    
    /**
     * Generate RemoteViews for collapsed notification content
     */
    suspend fun generateCollapsed(
        context: Context,
        payload: VoltraPayload
    ): RemoteViews? {
        val node = payload.collapsed ?: return null
        Log.d(TAG, "Generating collapsed view")
        return generate(context, node, payload.e, payload.s, DpSize(360.dp, 64.dp))
    }
    
    /**
     * Generate RemoteViews for expanded notification content
     */
    suspend fun generateExpanded(
        context: Context,
        payload: VoltraPayload
    ): RemoteViews? {
        val node = payload.expanded ?: return null
        Log.d(TAG, "Generating expanded view")
        return generate(context, node, payload.e, payload.s, DpSize(360.dp, 256.dp))
    }
    
    private suspend fun generate(
        context: Context,
        node: VoltraNode,
        sharedElements: List<VoltraNode>?,
        sharedStyles: List<Map<String, Any>>?,
        size: DpSize
    ): RemoteViews {
        // Create a new GlanceRemoteViews instance each time to avoid caching issues
        val glanceRemoteViews = GlanceRemoteViews()
        val factory = GlanceFactory(sharedElements, sharedStyles)
        
        Log.d(TAG, "Composing Glance content with size: $size, sharedStyles count: ${sharedStyles?.size ?: 0}")
        
        val result = glanceRemoteViews.compose(context, size) {
            factory.RenderNode(node)
        }
        
        Log.d(TAG, "RemoteViews generated successfully")
        return result.remoteViews
    }
}
