package voltra.glance

import android.content.Context
import android.util.Log
import android.util.SizeF
import android.widget.RemoteViews
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.ExperimentalGlanceRemoteViewsApi
import androidx.glance.appwidget.GlanceRemoteViews
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import voltra.models.VoltraNode
import voltra.models.VoltraPayload
import voltra.widget.VoltraRefreshActionCallback

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
        val factory = GlanceFactory("notification", sharedElements, sharedStyles, size)

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

    /**
     * Generate RemoteViews for all widget size variants with a refresh button overlay.
     * Uses GlanceRemoteViews.compose() to render both the widget content and a clickable
     * refresh button, then returns RemoteViews that can be pushed directly via AppWidgetManager.
     */
    suspend fun generateWidgetRemoteViewsWithRefresh(
        context: Context,
        payload: VoltraPayload,
        widgetId: String,
    ): Map<SizeF, RemoteViews> {
        val variants = payload.variants ?: return emptyMap()
        val sharedElements = payload.e
        val sharedStyles = payload.s

        Log.d(TAG, "Generating widget RemoteViews with refresh button for ${variants.size} variants")

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

        for ((variantKey, width, height) in parsedVariants) {
            val node = variants[variantKey] ?: continue
            val size = DpSize(width.dp, height.dp)

            try {
                val glanceRemoteViews = GlanceRemoteViews()
                val factory = GlanceFactory(widgetId, sharedElements, sharedStyles, size)

                val composed =
                    glanceRemoteViews.compose(context, size) {
                        Box(modifier = GlanceModifier.fillMaxSize()) {
                            factory.Render(node)
                            // Refresh button overlay (same as VoltraGlanceWidget.RefreshButton)
                            Box(
                                modifier = GlanceModifier.fillMaxSize().padding(12.dp),
                                contentAlignment = Alignment.TopEnd,
                            ) {
                                Box(
                                    modifier =
                                        GlanceModifier
                                            .size(28.dp)
                                            .cornerRadius(14.dp)
                                            .background(
                                                ColorProvider(
                                                    day = Color(0x32787880),
                                                    night = Color(0x32787880),
                                                ),
                                            ).clickable(
                                                actionRunCallback<VoltraRefreshActionCallback>(
                                                    actionParametersOf(
                                                        VoltraRefreshActionCallback.KEY_WIDGET_ID to widgetId,
                                                    ),
                                                ),
                                            ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = "↻",
                                        style =
                                            TextStyle(
                                                fontSize = 18.sp,
                                                fontWeight = FontWeight.Bold,
                                                textAlign = TextAlign.Center,
                                                color =
                                                    ColorProvider(
                                                        day = Color(0x993C3C43),
                                                        night = Color(0x99EBEBF5),
                                                    ),
                                            ),
                                    )
                                }
                            }
                        }
                    }

                result[SizeF(width, height)] = composed.remoteViews
                Log.d(TAG, "Generated RemoteViews with refresh for variant $variantKey (${width}x$height)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to generate RemoteViews with refresh for variant $variantKey: ${e.message}", e)
            }
        }

        Log.d(TAG, "Successfully generated ${result.size} widget RemoteViews with refresh")
        return result
    }
}
