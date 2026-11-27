package voltra.styling

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class JSColorParserTest {
    private fun parsePair(
        day: Any?,
        night: Any?,
    ) = JSColorParser.parse(mapOf("day" to day, "night" to night), "backgroundColor")

    @Test
    fun parsesAPairOfHexColors() {
        assertEquals(
            VoltraColorValue.DayNight(day = Color.White, night = Color.Black),
            parsePair("#ffffff", "#000000"),
        )
    }

    @Test
    fun acceptsEveryStringGrammarOnEitherSide() {
        val red = Color(1f, 0f, 0f)
        val sides =
            listOf(
                "#f00",
                "#F00F",
                "#ff0000",
                "#ff0000ff",
                "ff0000",
                "rgb(255, 0, 0)",
                "rgba(255, 0, 0, 1)",
                "rgb(255 0 0 / 100%)",
                "hsl(0, 100%, 50%)",
                "hsla(0, 100%, 50%, 1)",
                "red",
                "  RED  ",
            )
        for (side in sides) {
            assertEquals(side, VoltraColorValue.DayNight(red, Color.Black), parsePair(side, "black"))
            assertEquals(side, VoltraColorValue.DayNight(Color.White, red), parsePair("white", side))
        }
        assertEquals(VoltraColorValue.DayNight(Color.Transparent, Color.Black), parsePair("transparent", "#000"))
    }

    @Test
    fun keepsAlphaPerSide() {
        val pair = parsePair("#ff000080", "rgba(0, 0, 255, 0.25)") as VoltraColorValue.DayNight

        assertEquals(128 / 255f, pair.day.alpha, 0.001f)
        assertEquals(0.25f, pair.night.alpha, 0.001f)
    }

    @Test
    fun ignoresExtraKeys() {
        val value = mapOf("day" to "#fff", "night" to "#000", "light" to "#f00", "color" to "~p")

        assertEquals(
            VoltraColorValue.DayNight(Color.White, Color.Black),
            JSColorParser.parse(value, "backgroundColor"),
        )
    }

    @Test
    fun dropsAnInvalidPair() {
        val invalid =
            mapOf(
                "missing day" to mapOf("night" to "#000"),
                "missing night" to mapOf("day" to "#fff"),
                "empty map" to emptyMap<String, Any?>(),
                "empty day" to mapOf("day" to "", "night" to "#000"),
                "blank night" to mapOf("day" to "#fff", "night" to "   "),
                "null day" to mapOf("day" to null, "night" to "#000"),
                "numeric day" to mapOf("day" to 0xFFFFFF, "night" to "#000"),
                "nested pair" to mapOf("day" to mapOf("day" to "#fff", "night" to "#000"), "night" to "#000"),
                "unparsable hex day" to mapOf("day" to "#zzzzzz", "night" to "#000"),
                "unparsable rgb night" to mapOf("day" to "#fff", "night" to "rgb(nope)"),
                "unparsable hsl night" to mapOf("day" to "#fff", "night" to "hsl(1, 2)"),
                "unknown name" to mapOf("day" to "not-a-color", "night" to "#000"),
                "token day" to mapOf("day" to "~p", "night" to "#000"),
                "token night" to mapOf("day" to "#fff", "night" to "~osf"),
                "both sides invalid" to mapOf("day" to "~p", "night" to 1),
            )

        for ((case, value) in invalid) {
            assertNull(case, JSColorParser.parse(value, "backgroundColor"))
        }
    }

    @Test
    fun leavesTheStringPathUnchanged() {
        assertEquals(VoltraColorValue.Static(Color.Red), JSColorParser.parse("#ff0000"))
        assertEquals(VoltraColorValue.Dynamic(VoltraThemeColorRole.PRIMARY), JSColorParser.parse("~p"))
        assertNull(JSColorParser.parse(""))
        assertNull(JSColorParser.parse(null))
    }
}
