package voltra.widget

import android.content.Context
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import voltra.glance.GlanceFactory
import voltra.models.VoltraPayload
import voltra.parsing.VoltraPayloadParser

class VoltraGlanceWidget(
    private val widgetId: String = "default",
) : GlanceAppWidget() {
    companion object {
        private const val TAG = "VoltraGlanceWidget"

        // Define size breakpoints for responsive widget rendering
        private val SMALL = DpSize(150.dp, 100.dp)
        private val MEDIUM_SQUARE = DpSize(200.dp, 200.dp)
        private val MEDIUM_WIDE = DpSize(250.dp, 150.dp)
        private val MEDIUM_TALL = DpSize(150.dp, 250.dp)
        private val LARGE = DpSize(300.dp, 200.dp)
        private val EXTRA_LARGE = DpSize(350.dp, 300.dp)
    }

    // Use responsive sizing to support multiple widget dimensions
    override val sizeMode =
        SizeMode.Responsive(
            setOf(SMALL, MEDIUM_SQUARE, MEDIUM_WIDE, MEDIUM_TALL, LARGE, EXTRA_LARGE),
        )

    override suspend fun provideGlance(
        context: Context,
        id: GlanceId,
    ) {
        // Parse data outside of composition to avoid try/catch in composable
        val widgetManager = VoltraWidgetManager(context)
        val jsonString = widgetManager.readWidgetJson(widgetId)

        val payload: VoltraPayload? =
            if (jsonString != null) {
                try {
                    VoltraPayloadParser.parse(jsonString)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing widget payload for widgetId=$widgetId: ${e.message}", e)
                    null
                }
            } else {
                Log.d(TAG, "No JSON data found for widgetId=$widgetId")
                null
            }

        provideContent {
            Content(payload)
        }
    }

    @Composable
    private fun Content(payload: VoltraPayload?) {
        val currentSize = LocalSize.current

        Log.d(TAG, "Content: widgetId=$widgetId, currentSize=${currentSize.width}x${currentSize.height}")

        if (payload == null) {
            Log.d(TAG, "Content: payload is null, showing placeholder")
            PlaceholderView()
            return
        }

        Log.d(
            TAG,
            "Content: variants keys=${payload.variants?.keys}, styles=${payload.s?.size ?: 0}, elements=${payload.e?.size ?: 0}",
        )

        // Select the best variant for current size
        val variantKey = selectVariantForSize(currentSize, payload.variants?.keys)
        val node =
            if (variantKey != null && payload.variants != null) {
                payload.variants[variantKey]
            } else {
                null
            }

        if (node != null) {
            Log.d(TAG, "Rendering widget widgetId=$widgetId with size variant: $variantKey")
            GlanceFactory(widgetId, payload.e, payload.s).Render(node)
        } else {
            Log.d(TAG, "Content: no matching variant found, showing placeholder")
            PlaceholderView()
        }
    }

    @Composable
    private fun PlaceholderView() {
        Box(
            modifier = GlanceModifier.fillMaxSize().padding(16.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text("Widget not configured")
        }
    }

    /**
     * Select the best variant key based on current widget size.
     * Matches against size keys in format "WIDTHxHEIGHT" (e.g., "150x100").
     */
    private fun selectVariantForSize(
        currentSize: DpSize,
        availableKeys: Set<String>?,
    ): String? {
        if (availableKeys == null || availableKeys.isEmpty()) {
            return null
        }

        val currentWidthDp = currentSize.width.value
        val currentHeightDp = currentSize.height.value

        // Parse available size keys into dimensions
        data class SizeVariant(
            val key: String,
            val width: Float,
            val height: Float,
        )

        val variants =
            availableKeys.mapNotNull { key: String ->
                val parts = key.split("x")
                if (parts.size == 2) {
                    val width = parts[0].toFloatOrNull()
                    val height = parts[1].toFloatOrNull()
                    if (width != null && height != null) {
                        SizeVariant(key, width, height)
                    } else {
                        null
                    }
                } else {
                    null
                }
            }

        if (variants.isEmpty()) {
            return null
        }

        // Find the closest match using Euclidean distance
        val bestMatch =
            variants.minByOrNull { variant: SizeVariant ->
                val widthDiff = variant.width - currentWidthDp
                val heightDiff = variant.height - currentHeightDp
                kotlin.math.sqrt(widthDiff * widthDiff + heightDiff * heightDiff)
            }

        Log.d(
            TAG,
            "Selected variant '${bestMatch?.key}' for size ${currentWidthDp}x$currentHeightDp (widgetId=$widgetId)",
        )
        return bestMatch?.key
    }
}
