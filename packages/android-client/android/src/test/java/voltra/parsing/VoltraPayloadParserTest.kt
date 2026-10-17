package voltra.parsing

import kotlinx.serialization.SerializationException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.models.resolveToVoltraNode

@RunWith(RobolectricTestRunner::class)
class VoltraPayloadParserTest {
    @Test
    fun parsesPayloadNodeShapesAndMetadata() {
        val payload =
            VoltraPayloadParser.parse(
                """
                {
                  "v": 1,
                  "variants": {
                    "100x100": {"t": 18, "i": "variant-text", "c": "Variant child", "p": {"txt": "Variant"}},
                    "text": "Hello",
                    "list": [{"t": 18, "p": {"txt": "Expanded"}}, {"${'$'}r": 0}]
                  },
                  "collapsed": {"also": "unknown key"},
                  "expanded": {"also": "unknown key"},
                  "s": [{"bg": "#fff", "nullable": null}],
                  "e": [{"t": 18, "p": {"txt": "Shared"}}],
                  "unknown": true
                }
                """.trimIndent(),
            )

        assertEquals(1, payload.v)
        // The collapsed and expanded fields are unknown keys: ignore them even when they
        // contain unsupported node shapes, and still decode the variants unchanged.
        assertEquals(VoltraNode.Text("Hello"), payload.variants?.get("text"))

        val listNode = payload.variants?.get("list")
        assertTrue(listNode is VoltraNode.Array)
        val list = listNode as VoltraNode.Array
        val listFirst = list.elements[0]
        assertTrue(listFirst is VoltraNode.Element)
        val listElement = listFirst as VoltraNode.Element
        assertEquals(18, listElement.element.t)
        assertEquals("Expanded", listElement.element.p?.get("text"))
        assertEquals(VoltraNode.Ref(0), list.elements[1])

        val variantNode = payload.variants?.get("100x100")
        assertTrue(variantNode is VoltraNode.Element)
        val variant = variantNode as VoltraNode.Element
        assertEquals("variant-text", variant.element.i)
        assertEquals(VoltraNode.Text("Variant child"), variant.element.c)
        assertEquals("Variant", variant.element.p?.get("text"))

        assertEquals(1, payload.s?.size)
        assertTrue(payload.s?.first()?.containsKey("nullable") == true)
        assertNull(payload.s?.first()?.get("nullable"))

        val sharedElementNode = payload.e?.firstOrNull()
        assertTrue(sharedElementNode is VoltraNode.Element)
        val sharedElement = sharedElementNode as VoltraNode.Element
        assertEquals("Shared", sharedElement.element.p?.get("text"))
    }

    @Test
    fun preservesDynamicPropTypesAndNodeLikeStructures() {
        val payload =
            VoltraPayloadParser.parse(
                """
                {
                  "v": 1,
                  "variants": {
                    "content": {
                      "t": 18,
                      "p": {
                        "txt": "hello",
                        "enabled": true,
                        "count": 7,
                        "ratio": 1.5,
                        "nullable": null,
                        "nested": {"flag": false, "value": 2},
                        "items": [1, null, {"deep": "value"}],
                        "fallback": {"t": 18, "p": {"txt": "child"}},
                        "listChildren": ["a", {"t": 18, "p": {"txt": "b"}}]
                      }
                    }
                  }
                }
                """.trimIndent(),
            )

        val contentNode = payload.variants?.get("content")
        assertTrue(contentNode is VoltraNode.Element)
        val element = (contentNode as VoltraNode.Element).element
        assertTrue(element.p != null)
        val props = element.p as Map<String, Any?>

        assertEquals("hello", props["text"])
        assertEquals(true, props["enabled"])
        assertTrue(props["count"] is Number)
        assertEquals(7, (props["count"] as Number).toInt())
        assertTrue(props["ratio"] is Number)
        assertEquals(1.5, (props["ratio"] as Number).toDouble(), 0.0)
        assertTrue(props.containsKey("nullable"))
        assertNull(props["nullable"])

        val nestedValue = props["nested"]
        assertTrue(nestedValue is Map<*, *>)
        val nested = nestedValue as Map<*, *>
        assertEquals(false, nested["flag"])
        assertEquals(2, (nested["value"] as Number).toInt())

        val itemsValue = props["items"]
        assertTrue(itemsValue is List<*>)
        val items = itemsValue as List<*>
        assertEquals(3, items.size)
        assertNull(items[1])
        assertEquals("value", (items[2] as Map<*, *>)["deep"])

        val fallbackNode = resolveToVoltraNode(props["fallback"], payload.s, payload.e)
        assertEquals(
            VoltraNode.Element(VoltraElement(t = 18, p = mapOf("text" to "child"))),
            fallbackNode,
        )

        val listChildrenNode = resolveToVoltraNode(props["listChildren"], payload.s, payload.e)
        assertTrue(listChildrenNode is VoltraNode.Array)
        val listChildren = listChildrenNode as VoltraNode.Array
        assertEquals(2, listChildren.elements.size)
        assertEquals(VoltraNode.Text("a"), listChildren.elements[0])
        assertTrue(listChildren.elements[1] is VoltraNode.Element)
    }

    @Test
    fun decompressesShortenedKeysInNestedPropsWithoutChangingElementShape() {
        val payload =
            VoltraPayloadParser.parse(
                """
                {
                  "v": 1,
                  "variants": {
                    "content": {
                      "t": 18,
                      "p": {
                        "txt": "Root",
                        "s": {"bg": "#fff", "nullable": null},
                        "fallback": {
                          "t": 18,
                          "p": {
                            "txt": "Nested",
                            "s": {"bg": "#000"}
                          },
                          "c": "Child"
                        }
                      }
                    }
                  },
                  "s": [{"bg": "#123456", "op": 0.4}]
                }
                """.trimIndent(),
            )

        val contentNode = payload.variants?.get("content")
        assertTrue(contentNode is VoltraNode.Element)
        val content = (contentNode as VoltraNode.Element).element
        assertEquals("Root", content.p?.get("text"))

        assertTrue(content.p != null)
        val contentProps = content.p as Map<String, Any?>
        val styleValue = contentProps["style"]
        assertTrue(styleValue is Map<*, *>)
        val style = styleValue as Map<*, *>
        assertEquals("#fff", style["backgroundColor"])
        assertTrue(style.containsKey("nullable"))
        assertNull(style["nullable"])

        val fallbackValue = contentProps["fallback"]
        assertTrue(fallbackValue is Map<*, *>)
        val fallback = fallbackValue as Map<*, *>
        assertEquals(18, (fallback["t"] as Number).toInt())
        assertEquals("Child", fallback["c"])
        val fallbackPropsValue = fallback["p"]
        assertTrue(fallbackPropsValue is Map<*, *>)
        val fallbackProps = fallbackPropsValue as Map<*, *>
        assertEquals("Nested", fallbackProps["text"])
        assertEquals("#000", (fallbackProps["style"] as Map<*, *>)["backgroundColor"])

        assertTrue(payload.s?.isNotEmpty() == true)
        val sharedStyle = payload.s!!.first()
        assertEquals("#123456", sharedStyle["backgroundColor"])
        assertEquals(0.4, (sharedStyle["opacity"] as Number).toDouble(), 0.0)
    }

    @Test
    fun ignoresUnknownKeysAndFailsClearlyForInvalidShapes() {
        val invalidNodeError =
            try {
                VoltraPayloadParser.parse(
                    """
                    {
                      "v": 1,
                      "variants": {"content": {"unexpected": true}},
                      "ignored": "value"
                    }
                    """.trimIndent(),
                )
                null
            } catch (error: SerializationException) {
                error
            }

        assertTrue(invalidNodeError?.message?.contains("Unsupported VoltraNode shape") == true)

        val missingFieldError =
            try {
                VoltraPayloadParser.parse("""{"variants":{"content":"missing version"}}""")
                null
            } catch (error: SerializationException) {
                error
            }

        assertTrue(missingFieldError?.message?.contains("v") == true)

        val payload =
            VoltraPayloadParser.parse(
                """
                {
                  "v": 1,
                  "variants": {"content": "ok"},
                  "extra": {"ignored": true}
                }
                """.trimIndent(),
            )

        assertEquals(VoltraNode.Text("ok"), payload.variants?.get("content"))
        assertFalse(payload.variants?.containsKey("extra") == true)
    }
}
