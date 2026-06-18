package voltra.parsing

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import voltra.models.VoltraNode

/**
 * Verifies [VoltraDecompressor.decompressNode] expands short keys in a standalone node tree —
 * the client-rendered path decodes the on-device renderer's output as a bare [VoltraNode]
 * (no `{v, variants, s, e}` envelope) and must decompress it before handing it to the Glance
 * renderer, which expects expanded keys.
 */
@RunWith(RobolectricTestRunner::class)
class VoltraDecompressorNodeTest {
    private val json =
        Json {
            ignoreUnknownKeys = true
            explicitNulls = false
        }

    @Test
    fun expandsShortKeysInStandaloneNode() {
        // Shape mirrors what renderAndroidVariantToJson emits: a Column with an inline style and
        // a Text child with its own style. `s` -> style, `bg` -> backgroundColor, `fs` -> fontSize.
        val node =
            json.decodeFromString<VoltraNode>(
                """
                {"t":9,"p":{"s":{"bg":"#000000"}},"c":[{"t":18,"c":"Hi","p":{"s":{"fs":14}}}]}
                """.trimIndent(),
            )

        val decompressed = VoltraDecompressor.decompressNode(node)

        assertTrue("root should be an Element", decompressed is VoltraNode.Element)
        val root = (decompressed as VoltraNode.Element).element
        assertEquals(9, root.t)

        @Suppress("UNCHECKED_CAST")
        val rootStyle = root.p?.get("style") as? Map<String, Any?>
        assertTrue("root prop 's' should expand to 'style'", rootStyle != null)
        assertEquals("#000000", rootStyle!!["backgroundColor"])

        val childNode = root.c
        assertTrue("child should be an Array", childNode is VoltraNode.Array)
        val child = (childNode as VoltraNode.Array).elements[0]
        assertTrue("child should be an Element", child is VoltraNode.Element)

        @Suppress("UNCHECKED_CAST")
        val childStyle = (child as VoltraNode.Element).element.p?.get("style") as? Map<String, Any?>
        assertTrue("child prop 's' should expand to 'style'", childStyle != null)
        assertTrue("child style should contain expanded 'fontSize'", childStyle!!.containsKey("fontSize"))
    }
}
