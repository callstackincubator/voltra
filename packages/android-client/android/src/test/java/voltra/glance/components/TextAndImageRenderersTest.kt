package voltra.glance.components

import android.graphics.Bitmap
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.GraphicsMode
import voltra.glance.GlanceRenderHelper
import voltra.glance.GlanceRenderHelper.Scheme
import voltra.glance.imageBitmaps
import voltra.glance.textColors

/**
 * Custom-font text is a bitmap baked at composition on every API level, so each scheme is composed on
 * its own, and reading its pixels needs native graphics.
 */
@RunWith(RobolectricTestRunner::class)
class TextAndImageRenderersTest {
    private val red = 0xFFFF0000.toInt()
    private val blue = 0xFF0000FF.toInt()
    private val pair = """{"day":"#ff0000","night":"#0000ff"}"""

    private fun hex(color: Int) = Integer.toHexString(color)

    @Test
    fun theTextColorPropWinsOverTheStyleColor() {
        val json = """{"t":18,"c":"Hi","p":{"s":{"c":"#00ff00"},"c":$pair}}"""

        assertEquals(blue, GlanceRenderHelper.render(json, composeUnder = Scheme.NIGHT).textColors()["Hi"])
    }

    /** Colors of the fully opaque pixels, which antialiasing leaves untouched inside the glyphs. */
    private fun Bitmap.opaqueColors(): Set<String> {
        val pixels = IntArray(width * height).also { getPixels(it, 0, width, 0, 0, width, height) }
        return pixels.filter { it ushr 24 == 0xFF }.map(::hex).toSet()
    }

    @Test
    @GraphicsMode(GraphicsMode.Mode.NATIVE)
    fun customFontTextIsDrawnInEachSidesColor() {
        // A font family plus `renderAsBitmap` sends Text down the custom-font bitmap path.
        val font = """"ff":"serif","fs":48"""
        val cases =
            mapOf(
                "style color" to """{"t":18,"c":"HH","p":{"renderAsBitmap":true,"s":{$font,"c":$pair}}}""",
                "color prop" to """{"t":18,"c":"HH","p":{"renderAsBitmap":true,"c":$pair,"s":{$font}}}""",
            )

        for ((name, json) in cases) {
            val day = GlanceRenderHelper.render(json, composeUnder = Scheme.DAY).imageBitmaps().single()
            val night = GlanceRenderHelper.render(json, composeUnder = Scheme.NIGHT).imageBitmaps().single()

            assertEquals("$name by day", setOf(hex(red)), day.opaqueColors())
            assertEquals("$name by night", setOf(hex(blue)), night.opaqueColors())
        }
    }
}
