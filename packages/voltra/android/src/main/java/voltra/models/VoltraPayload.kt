package voltra.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import voltra.parsing.DynamicObjectListSerializer
import voltra.parsing.DynamicObjectSerializer
import voltra.parsing.VoltraNodeSerializer

/**
 * Root payload for both Live Updates and Widgets
 */
@Serializable
data class VoltraPayload(
    @SerialName("v")
    val v: Int, // Version
    val collapsed: VoltraNode? = null, // Collapsed content (Live Updates)
    val expanded: VoltraNode? = null, // Expanded content (Live Updates)
    val variants: Map<String, VoltraNode>? = null, // Size variants (Widgets)
    @Serializable(with = DynamicObjectListSerializer::class)
    val s: List<Map<String, Any?>>? = null, // Shared styles
    val e: List<VoltraNode>? = null, // Shared elements
    val smallIcon: String? = null,
    val channelId: String? = null,
)

/**
 * Element matching VoltraElementJson { t, i?, c?, p? }
 */
@Serializable
data class VoltraElement(
    @SerialName("t")
    val t: Int, // Component type ID
    @SerialName("i")
    val i: String? = null, // Optional ID
    @SerialName("c")
    val c: VoltraNode? = null, // Children
    @SerialName("p")
    @Serializable(with = DynamicObjectSerializer::class)
    val p: Map<String, Any?>? = null, // Props including style
)

/**
 * Reference to shared element { $r: index }
 */
@Serializable
data class VoltraElementRef(
    @SerialName("\$r")
    val `$r`: Int,
)

/**
 * Union type for nodes: Element | Array | Ref | String
 */
@Serializable(with = VoltraNodeSerializer::class)
sealed class VoltraNode {
    data class Element(
        val element: VoltraElement,
    ) : VoltraNode()

    data class Array(
        val elements: List<VoltraNode>,
    ) : VoltraNode()

    data class Ref(
        val ref: Int,
    ) : VoltraNode()

    data class Text(
        val text: String,
    ) : VoltraNode()
}

/**
 * Resolve a raw prop value into a VoltraNode with shared context.
 * Unlike parseVoltraNode, this eagerly resolves $r references (matching iOS behavior).
 */
@Suppress("UNCHECKED_CAST")
fun resolveToVoltraNode(
    value: Any?,
    sharedStyles: List<Map<String, Any?>>?,
    sharedElements: List<VoltraNode>?,
): VoltraNode? {
    return when (value) {
        null -> {
            null
        }

        is VoltraNode -> {
            value
        }

        is String -> {
            VoltraNode.Text(value)
        }

        is Number -> {
            VoltraNode.Text(value.toString())
        }

        is Boolean -> {
            VoltraNode.Text(value.toString())
        }

        is List<*> -> {
            val elements = value.mapNotNull { resolveToVoltraNode(it, sharedStyles, sharedElements) }
            if (elements.isEmpty()) null else VoltraNode.Array(elements)
        }

        is Map<*, *> -> {
            val map = value as Map<String, Any?>
            val ref = map["\$r"] as? Number
            if (ref != null) {
                return sharedElements?.getOrNull(ref.toInt())
            }
            val typeId = map["t"] as? Number ?: return null
            val id = map["i"] as? String
            val child = resolveToVoltraNode(map["c"], sharedStyles, sharedElements)
            val props = map["p"] as? Map<String, Any?>
            VoltraNode.Element(VoltraElement(t = typeId.toInt(), i = id, c = child, p = props))
        }

        else -> {
            null
        }
    }
}

/**
 * Extract a ReactNode-typed prop from this element, resolving it with shared context.
 * Mirrors iOS's VoltraElement.componentProp(_:).
 */
fun VoltraElement.componentProp(
    propName: String,
    sharedStyles: List<Map<String, Any?>>?,
    sharedElements: List<VoltraNode>?,
): VoltraNode? {
    val value = p?.get(propName) ?: return null
    return resolveToVoltraNode(value, sharedStyles, sharedElements)
}
