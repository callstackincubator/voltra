package voltra.glance

import android.content.Context
import android.util.Log
import android.util.SizeF
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
        payload: VoltraPayload,
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
        payload: VoltraPayload,
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
        size: DpSize,
    ): RemoteViews {
        // Create a new GlanceRemoteViews instance each time to avoid caching issues
        val glanceRemoteViews = GlanceRemoteViews()
        // Use empty widgetId for notification RemoteViews (not widget-specific)
        val factory = GlanceFactory("notification", sharedElements, sharedStyles)

        Log.d(TAG, "Composing Glance content with size: $size, sharedStyles count: ${sharedStyles?.size ?: 0}")

        val result =
            glanceRemoteViews.compose(context, size) {
                factory.Render(node)
            }

        Log.d(TAG, "RemoteViews generated successfully")
        return result.remoteViews
    }

    /**
     * Generate RemoteViews for all widget size variants.
     * Returns a mapping of SizeF to RemoteViews for Android 12+ responsive widgets.
     * This bypasses Glance's session lock mechanism.
     */
    suspend fun generateWidgetRemoteViews(
        context: Context,
        payload: VoltraPayload,
    ): Map<SizeF, RemoteViews> {
        val variants = payload.variants ?: return emptyMap()
        val sharedElements = payload.e
        val sharedStyles = payload.s

        Log.d(TAG, "Generating widget RemoteViews for ${variants.size} variants")

        // Parse variant keys to get available sizes
        val parsedVariants =
            variants.keys.mapNotNull { key ->
                val parts = key.split("x")
                if (parts.size == 2) {
                    val width = parts[0].toFloatOrNull()
                    val height = parts[1].toFloatOrNull()
                    if (width != null && height != null) {
                        Triple(key, width, height)
                    } else {
                        null
                    }
                } else {
                    null
                }
            }

        if (parsedVariants.isEmpty()) {
            Log.w(TAG, "No valid size variants found in payload")
            return emptyMap()
        }

        val result = mutableMapOf<SizeF, RemoteViews>()

        // Generate RemoteViews for each variant
        for ((variantKey, width, height) in parsedVariants) {
            val node = variants[variantKey] ?: continue
            val size = DpSize(width.dp, height.dp)

            try {
                val remoteViews = generate(context, node, sharedElements, sharedStyles, size)
                result[SizeF(width, height)] = remoteViews
                Log.d(TAG, "Generated RemoteViews for variant $variantKey (${width}x$height)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to generate RemoteViews for variant $variantKey: ${e.message}", e)
            }
        }

        Log.d(TAG, "Successfully generated ${result.size} widget RemoteViews")
        return result
    }
}
