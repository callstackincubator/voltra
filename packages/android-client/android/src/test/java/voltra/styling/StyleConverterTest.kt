package voltra.styling

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
