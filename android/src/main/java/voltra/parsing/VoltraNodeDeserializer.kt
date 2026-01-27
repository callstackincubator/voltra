package voltra.parsing

import com.google.gson.*
import voltra.models.*
import java.lang.reflect.Type

class VoltraNodeDeserializer : JsonDeserializer<VoltraNode> {
    override fun deserialize(
        json: JsonElement,
        typeOfT: Type,
        context: JsonDeserializationContext,
    ): VoltraNode =
        when {
            // String → Text node
            json.isJsonPrimitive && json.asJsonPrimitive.isString -> {
                VoltraNode.Text(json.asString)
            }

            // Array → Array of nodes
            json.isJsonArray -> {
                val elements =
                    json.asJsonArray.map {
                        context.deserialize<VoltraNode>(it, VoltraNode::class.java)
                    }
                VoltraNode.Array(elements)
            }

            // Object with $r → Reference
            json.isJsonObject && json.asJsonObject.has("\$r") -> {
                VoltraNode.Ref(json.asJsonObject.get("\$r").asInt)
            }

            // Object with t → Element
            json.isJsonObject && json.asJsonObject.has("t") -> {
                val element = context.deserialize<VoltraElement>(json, VoltraElement::class.java)
                VoltraNode.Element(element)
            }

            else -> {
                throw JsonParseException("Unknown VoltraNode format: $json")
            }
        }
}
