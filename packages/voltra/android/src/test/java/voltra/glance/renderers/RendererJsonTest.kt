package voltra.glance.renderers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RendererJsonTest {
    @Test
    fun parsesImageSourceMapFromJsonString() {
        val result = parseImageSourceMap("""{"assetName":"hero","base64":"abc"}""")

        assertNotNull(result)
        assertEquals("hero", result?.get("assetName"))
        assertEquals("abc", result?.get("base64"))
    }

    @Test
    fun returnsNullForInvalidImageSourceJsonString() {
        val result = parseImageSourceMap("{not-valid")

        assertNull(result)
    }

    @Test
    fun passesThroughImageSourceMapInput() {
        val source = linkedMapOf<String, Any?>("assetName" to "hero", "base64" to null)

        val result = parseImageSourceMap(source)

        assertTrue(result === source)
    }

    @Test
    fun handlesNullImageSourceInput() {
        assertNull(parseImageSourceMap(null))
        assertNull(parseEncodedImageSource(null))
    }

    @Test
    fun parsesEncodedImageSourceFromMapAndString() {
        val fromMap = parseEncodedImageSource(mapOf("assetName" to "logo"))
        val fromString = parseEncodedImageSource("""{"base64":"Zm9v","ignored":true}""")

        assertEquals("logo", fromMap?.assetName)
        assertNull(fromMap?.base64)
        assertEquals("Zm9v", fromString?.base64)
        assertNull(fromString?.assetName)
    }

    @Test
    fun parsesForegroundStyleScaleEntries() {
        val result = parseForegroundStyleScaleEntries("""[["sales","#ff0000"],["profit","#00ff00"]]""")

        assertEquals(listOf(listOf("sales", "#ff0000"), listOf("profit", "#00ff00")), result)
    }

    @Test
    fun returnsNullForInvalidForegroundStyleScaleEntries() {
        assertNull(parseForegroundStyleScaleEntries("{"))
    }

    @Test
    fun parsesMarksJsonPreservingNumbersAndNullRuleData() {
        val marks =
            parseMarksJson(
                """
                [
                  ["bar", [["Jan", 10, "sales"], ["Feb", 12.5, "sales"]], {"w": 18, "cr": 4.5, "c": "#ff0000", "stk": "grouped"}],
                  ["rule", null, {"yv": 8, "lw": 1.5}],
                  ["sector", [[25, "alpha"], [75, "beta"]], {"ir": 0.4, "or": 1, "agin": 2}]
                ]
                """.trimIndent(),
            )

        assertEquals(3, marks.size)

        val barMark = marks[0]
        assertEquals("bar", barMark.type)
        assertNotNull(barMark.data)
        assertTrue(barMark.data!![0][1] is Number)
        assertEquals(10, (barMark.data!![0][1] as Number).toInt())
        assertTrue(barMark.data!![1][1] is Number)
        assertEquals(12.5, (barMark.data!![1][1] as Number).toDouble(), 0.0)
        assertTrue(barMark.props["w"] is Number)
        assertEquals(18, (barMark.props["w"] as Number).toInt())
        assertTrue(barMark.props["cr"] is Number)
        assertEquals(4.5, (barMark.props["cr"] as Number).toDouble(), 0.0)

        val ruleMark = marks[1]
        assertEquals("rule", ruleMark.type)
        assertNull(ruleMark.data)
        assertEquals(8.0, (ruleMark.props["yv"] as Number).toDouble(), 0.0)

        val sectorMark = marks[2]
        assertEquals("sector", sectorMark.type)
        assertEquals(2, sectorMark.data?.size)
        assertEquals("alpha", sectorMark.data?.get(0)?.get(1))
    }

    @Test
    fun returnsEmptyListForMalformedMarksJson() {
        assertTrue(parseMarksJson("[").isEmpty())
    }
}
