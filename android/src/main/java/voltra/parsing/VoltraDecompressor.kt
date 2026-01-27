package voltra.parsing

import voltra.generated.ShortNames
import voltra.models.*

/**
 * Utility to expand shortened keys in the Voltra payload back to their full names.
 * This should be run as the first step after JSON parsing.
 */
object VoltraDecompressor {
    /**
     * Decompress the entire payload recursively.
     */
    fun decompress(payload: VoltraPayload): VoltraPayload =
        payload.copy(
            collapsed = payload.collapsed?.let { decompressNode(it) },
            expanded = payload.expanded?.let { decompressNode(it) },
            variants = payload.variants?.mapValues { decompressNode(it.value) },
            s = payload.s?.map { decompressMap(it) },
            e = payload.e?.map { decompressNode(it) },
        )

    private fun decompressNode(node: VoltraNode): VoltraNode =
        when (node) {
            is VoltraNode.Element -> VoltraNode.Element(decompressElement(node.element))
            is VoltraNode.Array -> VoltraNode.Array(node.elements.map { decompressNode(it) })
            else -> node // Text and Ref are primitive/don't have keys
        }

    private fun decompressElement(element: VoltraElement): VoltraElement =
        element.copy(
            p = element.p?.let { decompressMap(it) },
            c = element.c?.let { decompressNode(it) },
        )

    /**
     * Recursively decompress a map of props or styles.
     */
    @Suppress("UNCHECKED_CAST")
    private fun decompressMap(map: Map<String, Any>): Map<String, Any> {
        val result = mutableMapOf<String, Any>()

        for ((key, value) in map) {
            val expandedKey = ShortNames.expand(key)
            val expandedValue =
                when (value) {
                    is Map<*, *> -> decompressMap(value as Map<String, Any>)
                    is List<*> -> value.map { if (it is Map<*, *>) decompressMap(it as Map<String, Any>) else it }
                    else -> value
                }
            result[expandedKey] = expandedValue
        }

        return result
    }
}
