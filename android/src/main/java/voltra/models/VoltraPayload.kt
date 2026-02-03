package voltra.models

/**
 * Root payload for both Live Updates and Widgets
 */
data class VoltraPayload(
    val v: Int, // Version
    val collapsed: VoltraNode? = null, // Collapsed content (Live Updates)
    val expanded: VoltraNode? = null, // Expanded content (Live Updates)
    val variants: Map<String, VoltraNode>? = null, // Size variants (Widgets)
    val s: List<Map<String, Any>>? = null, // Shared styles
    val e: List<VoltraNode>? = null, // Shared elements
    val smallIcon: String? = null,
    val channelId: String? = null,
)

/**
 * Element matching VoltraElementJson { t, i?, c?, p? }
 */
data class VoltraElement(
    val t: Int, // Component type ID
    val i: String? = null, // Optional ID
    val c: VoltraNode? = null, // Children
    val p: Map<String, Any>? = null, // Props including style
)

/**
 * Reference to shared element { $r: index }
 */
data class VoltraElementRef(
    val `$r`: Int,
)

/**
 * Union type for nodes: Element | Array | Ref | String
 */
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
