package voltra.glance.renderers

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.GraphicsMode
import voltra.styling.LayoutStyle
import voltra.styling.SizeValue
import android.graphics.Color as AndroidColor

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class BorderBitmapRendererTest {
    private val context: Context
        get() = RuntimeEnvironment.getApplication()

    @Test
    fun resolvesSizeOnlyWhenBothDimensionsAreFixed() {
        assertEquals(DpSize(40.dp, 20.dp), resolveBorderSize(layout(SizeValue.Fixed(40.dp), SizeValue.Fixed(20.dp))))
        assertNull(resolveBorderSize(layout(SizeValue.Fill, SizeValue.Fixed(20.dp))))
        assertNull(resolveBorderSize(layout(SizeValue.Fixed(40.dp), SizeValue.Wrap)))
        assertNull(resolveBorderSize(layout(SizeValue.Fixed(40.dp), null)))
        assertNull(resolveBorderSize(layout(SizeValue.Fixed(0.dp), SizeValue.Fixed(20.dp))))
    }

    @Test
    fun drawsBorderInsideBoundsOverBackground() {
        val bitmap = render(width = 40, height = 20, borderWidth = 4, background = AndroidColor.BLUE)

        assertEquals(40 * density(), bitmap.width)
        assertEquals(20 * density(), bitmap.height)
        assertEquals(AndroidColor.RED, bitmap.getPixel(0, bitmap.height / 2))
        assertEquals(AndroidColor.RED, bitmap.getPixel(bitmap.width - 1, bitmap.height / 2))
        assertEquals(AndroidColor.RED, bitmap.getPixel(bitmap.width / 2, 0))
        assertEquals(AndroidColor.RED, bitmap.getPixel(bitmap.width / 2, bitmap.height - 1))
        assertEquals(AndroidColor.BLUE, bitmap.getPixel(bitmap.width / 2, bitmap.height / 2))
        // Just inside the border.
        assertEquals(AndroidColor.BLUE, bitmap.getPixel(4 * density() + 1, bitmap.height / 2))
    }

    @Test
    fun leavesInteriorTransparentWithoutBackground() {
        val bitmap = render(width = 20, height = 20, borderWidth = 2, background = AndroidColor.TRANSPARENT)

        assertEquals(AndroidColor.RED, bitmap.getPixel(0, bitmap.height / 2))
        assertEquals(0, AndroidColor.alpha(bitmap.getPixel(bitmap.width / 2, bitmap.height / 2)))
    }

    @Test
    fun roundsBorderAndBackgroundCorners() {
        val bitmap = render(width = 40, height = 40, borderWidth = 2, cornerRadius = 16, background = AndroidColor.BLUE)

        assertEquals(0, AndroidColor.alpha(bitmap.getPixel(0, 0)))
        assertEquals(0, AndroidColor.alpha(bitmap.getPixel(bitmap.width - 1, bitmap.height - 1)))
        assertEquals(AndroidColor.RED, bitmap.getPixel(0, bitmap.height / 2))
        assertEquals(AndroidColor.RED, bitmap.getPixel(bitmap.width / 2, 0))
        assertEquals(AndroidColor.BLUE, bitmap.getPixel(bitmap.width / 2, bitmap.height / 2))
    }

    @Test
    fun drawsGradientFillUnderBorder() {
        val fill = Bitmap.createBitmap(8, 8, Bitmap.Config.ARGB_8888).apply { eraseColor(AndroidColor.GREEN) }
        val bitmap =
            renderBorderBitmap(
                context = context,
                size = DpSize(20.dp, 20.dp),
                cornerRadius = null,
                borderWidth = 2.dp,
                borderArgb = AndroidColor.RED,
                backgroundArgb = AndroidColor.BLUE,
                backgroundFill = fill,
            )

        assertEquals(AndroidColor.RED, bitmap.getPixel(0, bitmap.height / 2))
        assertEquals(AndroidColor.GREEN, bitmap.getPixel(bitmap.width / 2, bitmap.height / 2))
    }

    @Test
    fun scalesBorderWithCappedBitmap() {
        val bitmap = render(width = 2000, height = 100, borderWidth = 20, background = AndroidColor.BLUE)

        assertTrue(bitmap.width <= 512)
        val scale = bitmap.width / (2000f * density())
        val strokePx = (20 * density() * scale).toInt()
        assertTrue("stroke should survive capping", strokePx >= 2)
        assertEquals(AndroidColor.RED, bitmap.getPixel(strokePx / 2, bitmap.height / 2))
        assertEquals(AndroidColor.BLUE, bitmap.getPixel(bitmap.width / 2, bitmap.height / 2))
    }

    private fun render(
        width: Int,
        height: Int,
        borderWidth: Int,
        cornerRadius: Int? = null,
        background: Int,
    ): Bitmap =
        renderBorderBitmap(
            context = context,
            size = DpSize(width.dp, height.dp),
            cornerRadius = cornerRadius?.dp,
            borderWidth = borderWidth.dp,
            borderArgb = AndroidColor.RED,
            backgroundArgb = background,
        ).also { assertNotNull(it) }

    private fun density(): Int =
        context.resources.displayMetrics.density
            .coerceAtLeast(1f)
            .toInt()

    private fun layout(
        width: SizeValue?,
        height: SizeValue?,
    ) = LayoutStyle(width = width, height = height)
}
