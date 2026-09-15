package voltra.widget.server

/**
 * Turns a merged `env.configuration` map into the canonical form ADR 0007 sends on the wire and
 * hashes into an instance key.
 *
 * Canonical serialization: keys sorted by Unicode code point, no whitespace, values as JSON
 * strings. Decoded, it is byte for byte what the widget sees as `env.configuration`, so server and
 * widget agree by construction. Both platforms produce this same string for the same map, which is
 * what lets the hash below be a stable, cross-platform instance identity.
 */
object WidgetCanonicalConfiguration {
    /**
     * The canonical JSON string for [configuration], or null when the map is empty — a widget with
     * no configuration parameters has exactly one instance, the widget scope, and sends neither
     * `instance` nor `configuration`.
     */
    fun canonicalize(configuration: Map<String, String>): String? {
        if (configuration.isEmpty()) return null
        val sortedKeys = configuration.keys.sortedWith(codePointOrder)
        // Hand-rolled rather than org.json: Android's JSONObject escapes `/` as `\/` and control
        // characters as `\b` / `\f`, which the Swift encoder does not, and the two platforms must
        // produce the same bytes for the same map (ADR 0007). Escapes: `"`, `\`, `\n`, `\r`,
        // `\t`, other C0 controls as `\u00XX`; everything else verbatim.
        return sortedKeys.joinToString(prefix = "{", separator = ",", postfix = "}") { key ->
            "${encodeJsonString(key)}:${encodeJsonString(configuration.getValue(key))}"
        }
    }

    private fun encodeJsonString(value: String): String {
        val out = StringBuilder(value.length + 2).append('"')
        value.forEach { ch ->
            when {
                ch == '"' -> out.append("\\\"")
                ch == '\\' -> out.append("\\\\")
                ch == '\n' -> out.append("\\n")
                ch == '\r' -> out.append("\\r")
                ch == '\t' -> out.append("\\t")
                ch < ' ' -> out.append(String.format("\\u%04x", ch.code))
                else -> out.append(ch)
            }
        }
        return out.append('"').toString()
    }

    /**
     * The instance key for [configuration]: FNV-1a, 32-bit, over the UTF-8 bytes of the canonical
     * serialization, rendered as 8 lowercase hex digits. Null when the map is empty, matching
     * [canonicalize].
     *
     * FNV-1a was picked for being small, dependency-free, and trivial to reproduce identically in
     * Swift — this is not a cryptographic hash, and nothing about instance identity depends on
     * collision resistance beyond "different configurations usually get different keys".
     */
    fun key(configuration: Map<String, String>): String? = canonicalize(configuration)?.let { fnv1a32Hex(it) }

    /** `String.compareTo` already orders by UTF-16 code unit, which agrees with code point order for the BMP; this is explicit about the rule rather than relying on the platform default. */
    private val codePointOrder =
        Comparator<String> { a, b ->
            val aCodePoints = a.codePoints().toArray()
            val bCodePoints = b.codePoints().toArray()
            val length = minOf(aCodePoints.size, bCodePoints.size)
            for (i in 0 until length) {
                val diff = aCodePoints[i] - bCodePoints[i]
                if (diff != 0) return@Comparator diff
            }
            aCodePoints.size - bCodePoints.size
        }

    private fun fnv1a32Hex(value: String): String {
        var hash = FNV_OFFSET_BASIS
        for (byte in value.toByteArray(Charsets.UTF_8)) {
            hash = hash xor (byte.toLong() and 0xFF)
            hash = (hash * FNV_PRIME) and 0xFFFFFFFFL
        }
        return hash.toString(16).padStart(8, '0')
    }

    private const val FNV_OFFSET_BASIS = 0x811c9dc5L
    private const val FNV_PRIME = 0x01000193L
}
