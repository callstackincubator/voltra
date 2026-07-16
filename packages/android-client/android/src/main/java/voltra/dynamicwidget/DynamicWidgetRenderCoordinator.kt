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
        dynamicWidgetRenderInput: DynamicWidgetRenderInput,
        dynamicWidgetEnvironmentJson: String,
    ): String?
}

internal data class DynamicWidgetRenderInput(
    val propsRevision: Long,
    val propsJson: String,
)

internal object DynamicWidgetHermesRuntimeBoundary : DynamicWidgetRuntimeBoundary {
    override fun renderDynamicWidget(
        dynamicWidgetId: String,
        dynamicWidgetRenderInput: DynamicWidgetRenderInput,
        dynamicWidgetEnvironmentJson: String,
    ): String? =
        VoltraJSRenderer.render(
            dynamicWidgetId,
            dynamicWidgetRenderInput.propsJson,
            dynamicWidgetEnvironmentJson,
        )
}

internal class DynamicWidgetRenderCoordinator(
    private val dynamicWidgetRuntimeBoundary: DynamicWidgetRuntimeBoundary = DynamicWidgetHermesRuntimeBoundary,
) {
    fun renderDynamicWidget(
        dynamicWidgetId: String,
        dynamicWidgetRenderInput: DynamicWidgetRenderInput,
        dynamicWidgetEnvironmentJson: String,
    ): VoltraNode? {
        val dynamicWidgetStandaloneNodeJson =
            dynamicWidgetRuntimeBoundary.renderDynamicWidget(
                dynamicWidgetId = dynamicWidgetId,
                dynamicWidgetRenderInput = dynamicWidgetRenderInput,
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
