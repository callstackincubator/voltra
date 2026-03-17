package voltra.parsing

import android.util.Log
import com.google.gson.Gson
import voltra.generated.ShortNames
import voltra.models.*

/**
 * Utility to expand shortened keys in the Voltra payload back to their full names.
 * This should be run as the first step after JSON parsing.
 */
object VoltraDecompressor {
    private const val TAG = "VoltraDecompressor"
    private val gson = Gson()

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
                    is Map<*, *> -> {
                        val mapValue = value as Map<String, Any>
                        // Detect if this is a VoltraElement structure
                        if (mapValue["t"] is Number) {
                            Log.d(
                                TAG,
                                "decompressMap: Detected element structure in prop '$key' (expanded: '$expandedKey')",
                            )
                            decompressElementStructure(mapValue)
                        } else {
                            decompressMap(mapValue)
                        }
                    }

                    is List<*> -> {
                        value.map {
                            when (it) {
                                is Map<*, *> -> {
                                    val mapItem = it as Map<String, Any>
                                    // Detect elements in lists too
                                    if (mapItem["t"] is Number) {
                                        decompressElementStructure(mapItem)
                                    } else {
                                        decompressMap(mapItem)
                                    }
                                }

                                else -> {
                                    it
                                }
                            }
                        }
                    }

                    else -> {
                        value
                    }
                }
            result[expandedKey] = expandedValue
        }

        return result
    }

    /**
     * Decompress a VoltraElement structure within props without expanding its structure field keys.
     * Structure keys like "t", "i", "c" are preserved, but nested props and children are processed.
     */
    @Suppress("UNCHECKED_CAST")
    private fun decompressElementStructure(map: Map<String, Any>): Map<String, Any> {
        Log.d(TAG, "decompressElementStructure: Processing element with type=${map["t"]}")
        val result = map.toMutableMap()

        // Decompress the "p" (props) field - expand prop keys
        if (map["p"] is Map<*, *>) {
            val originalProps = map["p"] as Map<String, Any>
            Log.d(TAG, "decompressElementStructure: Original props keys: ${originalProps.keys}")
            val decompressedProps = decompressMap(originalProps)
            Log.d(TAG, "decompressElementStructure: Decompressed props keys: ${decompressedProps.keys}")
            result["p"] = decompressedProps
        }

        // Decompress the "c" (children) field recursively
        val childValue = map["c"]
        if (childValue != null) {
            result["c"] = decompressNodeValue(childValue)
        }

        return result
    }

    /**
     * Decompress a value that represents a VoltraNode (element, array, text, or ref).
     */
    @Suppress("UNCHECKED_CAST")
    private fun decompressNodeValue(value: Any): Any =
        when (value) {
            is Map<*, *> -> {
                val mapValue = value as Map<String, Any>
                // Check if it's an element structure
                if (mapValue["t"] is Number) {
                    decompressElementStructure(mapValue)
                } else {
                    // Could be a ref ($r) or other map - don't expand keys for refs
                    mapValue
                }
            }

            is List<*> -> {
                // Array of nodes - recursively decompress each item
                value.map { item ->
                    if (item != null) {
                        decompressNodeValue(item)
                    } else {
                        item
                    }
                }
            }

            else -> {
                // Text nodes (strings, numbers) or null - pass through
                value
            }
        }
}
