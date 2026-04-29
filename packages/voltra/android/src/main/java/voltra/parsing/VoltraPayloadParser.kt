package voltra.parsing

import android.util.Log
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import voltra.models.VoltraPayload
import voltra.resolvable.AndroidWidgetResolvableEnvironment
import voltra.resolvable.ResolvablePayloadResolver

@OptIn(ExperimentalSerializationApi::class)
object VoltraPayloadParser {
    private const val TAG = "VoltraPayloadParser"

    private val json =
        Json {
            ignoreUnknownKeys = true
            explicitNulls = false
        }

    fun parse(jsonString: String): VoltraPayload {
        Log.d(TAG, "Parsing payload, length=${jsonString.length}")
        // Log first 500 chars to see the structure
        Log.d(TAG, "Payload preview: ${jsonString.take(500)}")

        val rawResult = json.decodeFromString<VoltraPayload>(jsonString)

        Log.d(TAG, "Decompressing payload...")
        val decompressed = VoltraDecompressor.decompress(rawResult)
        val result =
            ResolvablePayloadResolver.resolve(decompressed, AndroidWidgetResolvableEnvironment)

        Log.d(
            TAG,
            "Parsed and decompressed: collapsed=${result.collapsed != null}, expanded=${result.expanded != null}, variants=${result.variants?.keys}",
        )

        return result
    }
}
