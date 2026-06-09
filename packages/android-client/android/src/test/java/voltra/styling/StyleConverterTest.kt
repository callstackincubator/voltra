package voltra.styling

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
}
