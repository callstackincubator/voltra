package voltra.dynamicwidget

import android.util.Log
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import voltra.models.VoltraNode
import voltra.parsing.VoltraDecompressor
import voltra.runtime.VoltraJSRenderer

internal fun interface DynamicWidgetRuntimeBoundary {
    fun renderDynamicWidget(
        dynamicWidgetId: String,
        dynamicWidgetPropsJson: String,
        dynamicWidgetEnvironmentJson: String,
    ): String?
}

internal object DynamicWidgetHermesRuntimeBoundary : DynamicWidgetRuntimeBoundary {
    override fun renderDynamicWidget(
        dynamicWidgetId: String,
        dynamicWidgetPropsJson: String,
        dynamicWidgetEnvironmentJson: String,
    ): String? =
        VoltraJSRenderer.render(
            dynamicWidgetId,
            dynamicWidgetPropsJson,
            dynamicWidgetEnvironmentJson,
        )
}

internal class DynamicWidgetRenderCoordinator(
    private val dynamicWidgetRuntimeBoundary: DynamicWidgetRuntimeBoundary = DynamicWidgetHermesRuntimeBoundary,
) {
    fun renderDynamicWidget(
        dynamicWidgetId: String,
        dynamicWidgetPropsJson: String,
        dynamicWidgetEnvironmentJson: String,
    ): VoltraNode? {
        val dynamicWidgetStandaloneNodeJson =
            dynamicWidgetRuntimeBoundary.renderDynamicWidget(
                dynamicWidgetId = dynamicWidgetId,
                dynamicWidgetPropsJson = dynamicWidgetPropsJson,
                dynamicWidgetEnvironmentJson = dynamicWidgetEnvironmentJson,
            ) ?: return null

        return try {
            val dynamicWidgetNode =
                dynamicWidgetJson.decodeFromString<VoltraNode>(dynamicWidgetStandaloneNodeJson)
            VoltraDecompressor.decompressNode(dynamicWidgetNode)
        } catch (dynamicWidgetRenderException: Exception) {
            Log.e(
                DYNAMIC_WIDGET_RENDER_COORDINATOR_TAG,
                "Failed to parse Dynamic Widget node for dynamicWidgetId=$dynamicWidgetId: " +
                    dynamicWidgetRenderException.message,
            )
            null
        }
    }

    private companion object {
        private const val DYNAMIC_WIDGET_RENDER_COORDINATOR_TAG = "DynamicWidgetRenderCoordinator"

        @OptIn(ExperimentalSerializationApi::class)
        private val dynamicWidgetJson =
            Json {
                ignoreUnknownKeys = true
                explicitNulls = false
            }
    }
}
