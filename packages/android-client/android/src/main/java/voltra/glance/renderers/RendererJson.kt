package voltra.glance.renderers

import android.util.Log
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import voltra.parsing.toDynamicObject
import voltra.parsing.toDynamicValue

private const val TAG = "RendererJson"

@OptIn(ExperimentalSerializationApi::class)
internal val rendererJson: Json =
    Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

@Serializable
internal data class EncodedImageSource(
    val assetName: String? = null,
    val base64: String? = null,
)

internal fun parseImageSourceMap(sourceProp: Any?): Map<String, Any?>? =
    when (sourceProp) {
        null -> {
            null
        }

        is Map<*, *> -> {
            @Suppress("UNCHECKED_CAST")
            sourceProp as? Map<String, Any?>
        }

        is String -> {
            parseRendererJsonObject(sourceProp, "image source JSON")
        }

        else -> {
            null
        }
    }

internal fun parseEncodedImageSource(sourceProp: Any?): EncodedImageSource? {
    return when (sourceProp) {
        null -> {
            null
        }

        is Map<*, *> -> {
            val map = parseImageSourceMap(sourceProp) ?: return null
            EncodedImageSource(
                assetName = map["assetName"] as? String,
                base64 = map["base64"] as? String,
            )
        }

        is String -> {
            try {
                rendererJson.decodeFromString<EncodedImageSource>(sourceProp)
            } catch (error: Exception) {
                warn("Failed to parse image source JSON: $sourceProp", error)
                null
            }
        }

        else -> {
            null
        }
    }
}

internal fun parseForegroundStyleScaleEntries(json: String?): List<List<String>>? {
    if (json.isNullOrEmpty()) return null
    return try {
        rendererJson.decodeFromString(ListSerializer(ListSerializer(String.serializer())), json)
    } catch (error: Exception) {
        warn("Failed to parse foregroundStyleScale", error)
        null
    }
}

internal fun parseMarksTuples(marksJson: String): List<List<Any?>> {
    return try {
        val element = rendererJson.parseToJsonElement(marksJson)
        val array = element as? JsonArray ?: return emptyList()
        array.mapNotNull { tupleElement ->
            val tupleArray = tupleElement as? JsonArray ?: return@mapNotNull null
            tupleArray.map { it.toDynamicValue() }
        }
    } catch (error: Exception) {
        warn("Failed to parse marks JSON", error)
        emptyList()
    }
}

internal fun parseRendererJsonObject(
    json: String,
    label: String,
): Map<String, Any?>? =
    try {
        val element = rendererJson.parseToJsonElement(json)
        val jsonObject =
            element as? JsonObject
                ?: throw SerializationException("Expected JSON object for $label")
        jsonObject.toDynamicObject()
    } catch (error: Exception) {
        warn("Failed to parse $label", error)
        null
    }

private fun warn(
    message: String,
    error: Throwable,
) {
    try {
        Log.w(TAG, message, error)
    } catch (_: RuntimeException) {
        // Local unit tests may not provide android.util.Log.
    }
}
