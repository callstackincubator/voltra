package voltra.glance.renderers

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.layout.ContentScale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.GraphicsMode
import voltra.modifiers.NativeModifierSize
import voltra.styling.CompositeStyle
import voltra.styling.DecorationStyle
import voltra.styling.EdgeInsets
import voltra.styling.LayoutStyle
import voltra.styling.SizeValue

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class LegacyImageCornersTest {
    private val noNativeSize = NativeModifierSize(null, null)

    private fun style(
        width: SizeValue? = SizeValue.Fixed(48.dp),
        height: SizeValue? = SizeValue.Fixed(48.dp),
        radius: Float? = 16f,
        padding: EdgeInsets? = null,
        weight: Float? = null,
    ) = CompositeStyle(
        layout = LayoutStyle(width = width, height = height, padding = padding, weight = weight),
        decoration = DecorationStyle(cornerRadius = radius?.dp),
    )

    @Test
    fun `spec needs a radius and a fixed size`() {
        assertEquals(LegacyImageCorners.Spec(48f, 48f, 16f), LegacyImageCorners.spec(style(), noNativeSize, false))
        assertNull(LegacyImageCorners.spec(null, noNativeSize, false))
        assertNull(LegacyImageCorners.spec(style(radius = null), noNativeSize, false))
        assertNull(LegacyImageCorners.spec(style(radius = 0f), noNativeSize, false))
        assertNull(LegacyImageCorners.spec(style(width = SizeValue.Fill), noNativeSize, false))
        assertNull(LegacyImageCorners.spec(style(height = null), noNativeSize, false))
        assertNull(LegacyImageCorners.spec(style(weight = 1f), noNativeSize, false))
        assertNull(LegacyImageCorners.spec(style(padding = EdgeInsets(top = 4.dp)), noNativeSize, false))
        assertNull(LegacyImageCorners.spec(style(), noNativeSize, hasNativePadding = true))
    }

    @Test
    fun `native size modifiers win over the style size`() {
        val nativeSize = NativeModifierSize(SizeValue.Fixed(80.dp), null)
        assertEquals(LegacyImageCorners.Spec(80f, 48f, 16f), LegacyImageCorners.spec(style(), nativeSize, false))
        assertNull(LegacyImageCorners.spec(style(), NativeModifierSize(SizeValue.Fill, null), false))
    }

    @Test
    fun `crop maps the view onto the centre of the bitmap`() {
        // A 200x100 bitmap cropped into a 50x50 view shows its middle 100x100 at half scale.
        val mask = LegacyImageCorners.computeMask(200, 100, LegacyImageCorners.Spec(50f, 50f, 10f), ContentScale.Crop)!!
        assertEquals(50f, mask.rect.left, 0.001f)
        assertEquals(0f, mask.rect.top, 0.001f)
        assertEquals(150f, mask.rect.right, 0.001f)
        assertEquals(100f, mask.rect.bottom, 0.001f)
        assertEquals(20f, mask.radiusX, 0.001f)
        assertEquals(20f, mask.radiusY, 0.001f)
    }

    @Test
    fun `fit maps the view around a letterboxed bitmap`() {
        // A 200x100 bitmap fitted into a 50x50 view is 50x25, with 12.5 of empty view above and below.
        val mask = LegacyImageCorners.computeMask(200, 100, LegacyImageCorners.Spec(50f, 50f, 10f), ContentScale.Fit)!!
        assertEquals(0f, mask.rect.left, 0.001f)
        assertEquals(-50f, mask.rect.top, 0.001f)
        assertEquals(200f, mask.rect.right, 0.001f)
        assertEquals(150f, mask.rect.bottom, 0.001f)
        assertEquals(40f, mask.radiusX, 0.001f)
    }

    @Test
    fun `fill bounds scales each axis on its own`() {
        val mask =
            LegacyImageCorners.computeMask(200, 100, LegacyImageCorners.Spec(50f, 50f, 10f), ContentScale.FillBounds)!!
        assertEquals(0f, mask.rect.left, 0.001f)
        assertEquals(0f, mask.rect.top, 0.001f)
        assertEquals(200f, mask.rect.right, 0.001f)
        assertEquals(100f, mask.rect.bottom, 0.001f)
        assertEquals(40f, mask.radiusX, 0.001f)
        assertEquals(20f, mask.radiusY, 0.001f)
    }

    @Test
    fun `radius is capped at half the shorter view side`() {
        val mask =
            LegacyImageCorners.computeMask(
                100,
                100,
                LegacyImageCorners.Spec(40f, 20f, 50f),
                ContentScale.FillBounds,
            )!!
        assertEquals(25f, mask.radiusX, 0.001f)
        assertEquals(50f, mask.radiusY, 0.001f)
    }

    @Test
    fun `round clears the corners of a filling image`() {
        val source = solid(100, 100)
        val rounded = LegacyImageCorners.round(source, LegacyImageCorners.Spec(50f, 50f, 20f), ContentScale.Crop)

        assertEquals(100, rounded.width)
        assertEquals(100, rounded.height)
        assertEquals(0, Color.alpha(rounded.getPixel(0, 0)))
        assertEquals(0, Color.alpha(rounded.getPixel(99, 99)))
        assertEquals(Color.RED, rounded.getPixel(50, 50))
        assertEquals(Color.RED, rounded.getPixel(50, 0))
    }

    @Test
    fun `round leaves a letterboxed fit image square, like the view clip on Android 12`() {
        // 200x100 fitted into 50x50: the rounded corners fall in the empty space above and below.
        val rounded =
            LegacyImageCorners.round(
                solid(200, 100),
                LegacyImageCorners.Spec(50f, 50f, 10f),
                ContentScale.Fit,
            )

        assertEquals(Color.RED, rounded.getPixel(0, 0))
        assertEquals(Color.RED, rounded.getPixel(199, 99))
    }

    @Test
    fun `computeMask rejects an empty bitmap`() {
        assertNull(LegacyImageCorners.computeMask(0, 10, LegacyImageCorners.Spec(10f, 10f, 2f), ContentScale.Fit))
        assertNotNull(LegacyImageCorners.computeMask(10, 10, LegacyImageCorners.Spec(10f, 10f, 2f), ContentScale.Fit))
    }

    private fun solid(
        width: Int,
        height: Int,
    ): Bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).apply { eraseColor(Color.RED) }
}
