package voltra.styling

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowLog

@RunWith(RobolectricTestRunner::class)
class StyleConverterTest {
    @Test
    fun parsesBackgroundImageFromCamelCaseStyleKey() {
        val style =
            StyleConverter.convert(
                mapOf("backgroundImage" to "linear-gradient(to right, red, blue)"),
            )

        assertTrue(style.decoration.backgroundImage is BackgroundImageValue.LinearGradient)
    }

    @Test
    fun ignoresCssKebabCaseBackgroundImageKey() {
        val style =
            StyleConverter.convert(
                mapOf("background-image" to "linear-gradient(to right, red, blue)"),
            )

        assertNull(style.decoration.backgroundImage)
    }

    @Test
    fun keepsExistingBackgroundColorBehavior() {
        val style =
            StyleConverter.convert(
                mapOf("backgroundColor" to "#ff0000"),
            )

        assertTrue(style.decoration.backgroundColor is VoltraColorValue.Static)
        assertNull(style.decoration.backgroundImage)
    }

    @Test
    fun convertsLegacyStylePayloadWithoutBackgroundImage() {
        val style =
            StyleConverter.convert(
                mapOf(
                    "backgroundColor" to "#112233",
                    "width" to 120,
                    "height" to "100%",
                ),
            )

        assertTrue(style.decoration.backgroundColor is VoltraColorValue.Static)
        assertNull(style.decoration.backgroundImage)
        assertTrue(style.layout.width is SizeValue.Fixed)
        assertTrue(style.layout.height is SizeValue.Fill)
    }

    // MARK: - Both sides of a `backgroundImage` `{ day, night }` pair are converted

    private val pair =
        mapOf(
            "backgroundImage" to
                mapOf(
                    "day" to "linear-gradient(to right, #ff0000, #ff0000)",
                    "night" to "radial-gradient(circle at center, #0000ff, #0000ff)",
                ),
        )

    private fun BackgroundImageValue?.firstStopColor() = this?.stops?.firstOrNull()?.color

    @Test
    fun theDaySideIsConverted() {
        val image = StyleConverter.convert(pair).decoration.backgroundImage

        assertTrue(image.toString(), image is BackgroundImageValue.LinearGradient)
        assertEquals(VoltraColorValue.Static(Color.Red), image.firstStopColor())
    }

    @Test
    fun theNightSideIsConverted() {
        val image = StyleConverter.convert(pair).decoration.nightBackgroundImage

        assertTrue(image.toString(), image is BackgroundImageValue.RadialGradient)
        assertEquals(VoltraColorValue.Static(Color.Blue), image.firstStopColor())
    }

    @Test
    fun extraKeysInThePairAreIgnored() {
        val withExtra =
            mapOf(
                "backgroundImage" to
                    mapOf(
                        "day" to "linear-gradient(to right, #ff0000, #ff0000)",
                        "night" to "linear-gradient(to right, #0000ff, #0000ff)",
                        "dim" to 42,
                    ),
            )

        val image = StyleConverter.convert(withExtra).decoration.nightBackgroundImage

        assertEquals(VoltraColorValue.Static(Color.Blue), image.firstStopColor())
    }

    @Test
    fun anInvalidNightGradientIsWarnedAboutAndDropsThePairWhenConverted() {
        ShadowLog.clear()
        val invalidNight =
            mapOf(
                "backgroundImage" to
                    mapOf(
                        "day" to "linear-gradient(to right, #ff0000, #ff0000)",
                        "night" to "not a gradient",
                    ),
            )

        val decoration = StyleConverter.convert(invalidNight).decoration

        assertNull(decoration.backgroundImage)
        val warnings = ShadowLog.getLogsForTag("JSGradientParser").map { it.msg }
        assertEquals(1, warnings.size)
        assertTrue(warnings.single(), warnings.single().contains("night"))
    }

    @Test
    fun parsesNumericGapToDp() {
        val style = StyleConverter.convert(mapOf("gap" to 12))

        assertEquals(12f, style.layout.gap?.value)
    }

    @Test
    fun missingGapIsNull() {
        val style = StyleConverter.convert(mapOf("width" to 100))

        assertNull(style.layout.gap)
    }

    @Test
    fun invalidGapIsNull() {
        val style = StyleConverter.convert(mapOf("gap" to "not-a-number"))

        assertNull(style.layout.gap)
    }

    @Test
    fun negativeGapIsNull() {
        val style = StyleConverter.convert(mapOf("gap" to -8))

        assertNull(style.layout.gap)
    }
}
