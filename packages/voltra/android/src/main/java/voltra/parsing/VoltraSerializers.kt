package voltra.parsing

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.descriptors.element
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import voltra.models.VoltraElement
import voltra.models.VoltraNode

object VoltraNodeSerializer : KSerializer<VoltraNode> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("voltra.models.VoltraNode") {
            element<String>("shape")
        }

    override fun deserialize(decoder: Decoder): VoltraNode {
        val jsonDecoder = decoder as? JsonDecoder ?: error("VoltraNodeSerializer only supports JSON")
        return jsonDecoder.decodeJsonElement().toVoltraNode(jsonDecoder.json)
    }

    override fun serialize(
        encoder: Encoder,
        value: VoltraNode,
    ) {
        val jsonEncoder = encoder as? JsonEncoder ?: error("VoltraNodeSerializer only supports JSON")
        val jsonElement =
            when (value) {
                is VoltraNode.Text -> JsonPrimitive(value.text)
                is VoltraNode.Array -> JsonArray(value.elements.map { toJsonElement(jsonEncoder.json, it) })
                is VoltraNode.Ref -> JsonObject(mapOf("\$r" to JsonPrimitive(value.ref)))
                is VoltraNode.Element -> jsonEncoder.json.encodeToJsonElement(VoltraElement.serializer(), value.element)
            }
        jsonEncoder.encodeJsonElement(jsonElement)
    }
}

object DynamicObjectSerializer : KSerializer<Map<String, Any?>> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("voltra.parsing.DynamicObject")

    override fun deserialize(decoder: Decoder): Map<String, Any?> {
        val jsonDecoder = decoder as? JsonDecoder ?: error("DynamicObjectSerializer only supports JSON")
        val element = jsonDecoder.decodeJsonElement()
        return element.toDynamicObject()
    }

    override fun serialize(
        encoder: Encoder,
        value: Map<String, Any?>,
    ) {
        val jsonEncoder = encoder as? JsonEncoder ?: error("DynamicObjectSerializer only supports JSON")
        jsonEncoder.encodeJsonElement(toJsonElement(jsonEncoder.json, value))
    }
}

object DynamicObjectListSerializer : KSerializer<List<Map<String, Any?>>> {
    private val delegate = ListSerializer(DynamicObjectSerializer)

    override val descriptor: SerialDescriptor = delegate.descriptor

    override fun deserialize(decoder: Decoder): List<Map<String, Any?>> = delegate.deserialize(decoder)

    override fun serialize(
        encoder: Encoder,
        value: List<Map<String, Any?>>,
    ) {
        delegate.serialize(encoder, value)
    }
}

internal fun JsonElement.toVoltraNode(json: Json): VoltraNode =
    when (this) {
        is JsonPrimitive -> {
            if (isString) {
                VoltraNode.Text(content)
            } else {
                throw SerializationException("Unsupported VoltraNode primitive: $this")
            }
        }

        is JsonArray -> {
            VoltraNode.Array(map { it.toVoltraNode(json) })
        }

        is JsonObject -> {
            when {
                "\$r" in this -> {
                    val ref =
                        this.getValue("\$r").jsonPrimitive.intOrNull
                            ?: throw SerializationException("VoltraNode ref must be an integer: $this")
                    VoltraNode.Ref(ref)
                }

                "t" in this -> {
                    VoltraNode.Element(json.decodeFromJsonElement(VoltraElement.serializer(), this))
                }

                else -> {
                    throw SerializationException("Unsupported VoltraNode shape: $this")
                }
            }
        }
    }

internal fun JsonElement.toDynamicValue(): Any? =
    when (this) {
        JsonNull -> {
            null
        }

        is JsonObject -> {
            toDynamicObject()
        }

        is JsonArray -> {
            map { it.toDynamicValue() }
        }

        is JsonPrimitive -> {
            when {
                isString -> content
                booleanOrNull != null -> booleanOrNull
                intOrNull != null -> intOrNull
                longOrNull != null -> longOrNull
                doubleOrNull != null -> doubleOrNull
                else -> throw SerializationException("Unsupported JSON primitive: $this")
            }
        }
    }

internal fun JsonElement.toDynamicObject(): Map<String, Any?> {
    val jsonObject =
        this as? JsonObject
            ?: throw SerializationException("Expected JSON object but found: $this")
    return linkedMapOf<String, Any?>().apply {
        jsonObject.forEach { (key, value) ->
            put(key, value.toDynamicValue())
        }
    }
}

private fun toJsonElement(
    json: Json,
    value: Any?,
): JsonElement =
    when (value) {
        null -> {
            JsonNull
        }

        is VoltraNode -> {
            toJsonElement(json, value)
        }

        is Map<*, *> -> {
            JsonObject(
                value.entries.associate { (key, itemValue) ->
                    val stringKey =
                        key as? String
                            ?: throw SerializationException("Dynamic object keys must be strings: $key")
                    stringKey to toJsonElement(json, itemValue)
                },
            )
        }

        is List<*> -> {
            JsonArray(value.map { toJsonElement(json, it) })
        }

        is String -> {
            JsonPrimitive(value)
        }

        is Boolean -> {
            JsonPrimitive(value)
        }

        is Int -> {
            JsonPrimitive(value)
        }

        is Long -> {
            JsonPrimitive(value)
        }

        is Float -> {
            JsonPrimitive(value)
        }

        is Double -> {
            JsonPrimitive(value)
        }

        is Number -> {
            JsonPrimitive(value.toDouble())
        }

        else -> {
            throw SerializationException("Unsupported dynamic value type: ${value::class.qualifiedName}")
        }
    }

private fun toJsonElement(
    json: Json,
    node: VoltraNode,
): JsonElement =
    when (node) {
        is VoltraNode.Text -> JsonPrimitive(node.text)
        is VoltraNode.Array -> JsonArray(node.elements.map { toJsonElement(json, it) })
        is VoltraNode.Ref -> JsonObject(mapOf("\$r" to JsonPrimitive(node.ref)))
        is VoltraNode.Element -> json.encodeToJsonElement(VoltraElement.serializer(), node.element)
    }
