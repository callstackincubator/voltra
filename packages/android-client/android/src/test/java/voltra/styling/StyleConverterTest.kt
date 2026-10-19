package voltra.styling

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

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

    // MARK: - A `backgroundImage` `{ day, night }` pair is narrowed to one gradient by the night bit

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
    fun theDaySideIsConvertedWhenNotInNightMode() {
        val image = StyleConverter.convert(pair, isNightMode = false).decoration.backgroundImage

        assertTrue(image.toString(), image is BackgroundImageValue.LinearGradient)
        assertEquals(VoltraColorValue.Static(Color.Red), image.firstStopColor())
    }

    @Test
    fun theNightSideIsConvertedInNightMode() {
        val image = StyleConverter.convert(pair, isNightMode = true).decoration.backgroundImage

        assertTrue(image.toString(), image is BackgroundImageValue.RadialGradient)
        assertEquals(VoltraColorValue.Static(Color.Blue), image.firstStopColor())
    }

    @Test
    fun conversionDefaultsToTheDaySide() {
        val image = StyleConverter.convert(pair).decoration.backgroundImage

        assertTrue(image.toString(), image is BackgroundImageValue.LinearGradient)
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

        val image = StyleConverter.convert(withExtra, isNightMode = true).decoration.backgroundImage

        assertEquals(VoltraColorValue.Static(Color.Blue), image.firstStopColor())
    }
}
