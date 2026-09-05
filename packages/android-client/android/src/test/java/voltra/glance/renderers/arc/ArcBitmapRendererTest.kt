package voltra.glance.renderers.arc

import android.graphics.Bitmap
import android.graphics.Paint
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.GraphicsMode
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import android.graphics.Color as AndroidColor

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ArcBitmapRendererTest {
    private val red = AndroidColor.RED
    private val blue = AndroidColor.BLUE
    private val green = AndroidColor.GREEN

    private fun spec(
        sizePx: Int = 200,
        progress: Float = 0.5f,
        startAngle: Float = 135f,
        sweepAngle: Float = 270f,
        strokePx: Float = 16f,
        cap: Paint.Cap = Paint.Cap.ROUND,
        colorArgb: Int = red,
        trackColorArgb: Int = blue,
        gradientColorsArgb: List<Int> = emptyList(),
    ) = ArcSpec(
        sizePx = sizePx,
        progress = progress,
        startAngle = startAngle,
        sweepAngle = sweepAngle,
        strokePx = strokePx,
        cap = cap,
        colorArgb = colorArgb,
        trackColorArgb = trackColorArgb,
        gradientColorsArgb = gradientColorsArgb,
    )

    /** Pixel on the stroke centerline at [angleDegrees], measured the way `drawArc` measures. */
    private fun pixelAt(
        bitmap: Bitmap,
        spec: ArcSpec,
        angleDegrees: Float,
    ): Int {
        val center = spec.sizePx / 2f
        val radius = center - spec.strokePx / 2f
        val radians = Math.toRadians(angleDegrees.toDouble())
        val x = (center + radius * cos(radians)).roundToInt().coerceIn(0, bitmap.width - 1)
        val y = (center + radius * sin(radians)).roundToInt().coerceIn(0, bitmap.height - 1)
        return bitmap.getPixel(x, y)
    }

    private fun describe(color: Int): String =
        "a=${AndroidColor.alpha(color)}, r=${AndroidColor.red(color)}, " +
            "g=${AndroidColor.green(color)}, b=${AndroidColor.blue(color)}"

    private fun assertMostly(
        expected: Int,
        actual: Int,
        label: String,
    ) {
        assertTrue(
            "Expected mostly ${describe(expected)} for $label, got ${describe(actual)}",
            AndroidColor.alpha(actual) > 200 &&
                abs(AndroidColor.red(actual) - AndroidColor.red(expected)) < 60 &&
                abs(AndroidColor.green(actual) - AndroidColor.green(expected)) < 60 &&
                abs(AndroidColor.blue(actual) - AndroidColor.blue(expected)) < 60,
        )
    }

    @Test
    fun drawsTrackColorOnTheUnfilledPartOfTheTrack() {
        val spec = spec(progress = 0.5f)
        val bitmap = renderArcBitmap(spec)

        // Half of a 270 degree sweep starting at 135 degrees is filled, so 350 degrees is track.
        assertMostly(blue, pixelAt(bitmap, spec, 350f), "track at 350 degrees")
    }

    @Test
    fun drawsFillColorAtTheFilledEndOfTheArc() {
        val spec = spec(progress = 0.5f)
        val bitmap = renderArcBitmap(spec)

        assertMostly(red, pixelAt(bitmap, spec, 140f), "fill near the start")
        assertMostly(red, pixelAt(bitmap, spec, 265f), "fill near the filled end")
    }

    @Test
    fun leavesEverythingBeyondTheSweepTransparent() {
        val spec = spec(progress = 1f, startAngle = 135f, sweepAngle = 270f)
        val bitmap = renderArcBitmap(spec)

        // The gap sits between 45 and 135 degrees, centered on 90 degrees (bottom of the arc).
        assertEquals(0, AndroidColor.alpha(pixelAt(bitmap, spec, 90f)))
        // The middle of the bitmap is never painted either.
        assertEquals(0, AndroidColor.alpha(bitmap.getPixel(spec.sizePx / 2, spec.sizePx / 2)))
    }

    @Test
    fun drawsNothingForTheFilledArcAtZeroProgress() {
        val spec = spec(progress = 0f, trackColorArgb = AndroidColor.TRANSPARENT)
        val bitmap = renderArcBitmap(spec)

        for (x in 0 until bitmap.width) {
            for (y in 0 until bitmap.height) {
                assertEquals(
                    "Expected a fully transparent bitmap at ($x, $y)",
                    0,
                    AndroidColor.alpha(bitmap.getPixel(x, y)),
                )
            }
        }
    }

    @Test
    fun roundCapsPaintBeyondTheSweepWhileFlatCapsDoNot() {
        val roundSpec =
            spec(
                progress = 1f,
                sweepAngle = 180f,
                cap = Paint.Cap.ROUND,
                trackColorArgb = AndroidColor.TRANSPARENT,
            )
        val buttSpec = roundSpec.copy(cap = Paint.Cap.BUTT)

        val roundBitmap = renderArcBitmap(roundSpec)
        val buttBitmap = renderArcBitmap(buttSpec)

        // Just before the 135 degree start angle the round cap bulges out; the flat cap stops dead.
        val justBeforeStart = 132f
        assertTrue(
            "Round cap should paint just before the start angle",
            AndroidColor.alpha(pixelAt(roundBitmap, roundSpec, justBeforeStart)) > 200,
        )
        assertEquals(
            0,
            AndroidColor.alpha(pixelAt(buttBitmap, buttSpec, justBeforeStart)),
        )
    }

    @Test
    fun keepsRoundCapsInsideTheBitmapByInsettingTheOval() {
        val strokePx = 24f
        val spec =
            spec(
                sizePx = 200,
                progress = 1f,
                startAngle = 0f,
                sweepAngle = 360f,
                strokePx = strokePx,
                trackColorArgb = AndroidColor.TRANSPARENT,
            )
        val bitmap = renderArcBitmap(spec)

        val middleRow = spec.sizePx / 2
        // With the oval inset by half the stroke the band along the middle row spans x in 0..24.
        // Without the inset it would be centered on the bitmap edge and clipped to x in 0..12.
        assertMostly(red, bitmap.getPixel(2, middleRow), "outer edge of the ring")
        assertMostly(red, bitmap.getPixel(strokePx.toInt() - 4, middleRow), "inner edge of the ring")
        // Past the stroke the ring is hollow.
        assertEquals(0, AndroidColor.alpha(bitmap.getPixel(strokePx.toInt() + 8, middleRow)))
    }

    @Test
    fun appliesASweepGradientRotatedToTheStartAngle() {
        val spec =
            spec(
                progress = 1f,
                startAngle = 0f,
                sweepAngle = 360f,
                colorArgb = green,
                trackColorArgb = AndroidColor.TRANSPARENT,
                gradientColorsArgb = listOf(red, blue),
            )
        val bitmap = renderArcBitmap(spec)

        // The gradient runs from red at the start angle to blue just before wrapping around.
        assertMostly(red, pixelAt(bitmap, spec, 2f), "gradient start")
        assertMostly(blue, pixelAt(bitmap, spec, 358f), "gradient end")

        // Rotating the start angle moves the gradient with it.
        val rotated = spec.copy(startAngle = 90f)
        val rotatedBitmap = renderArcBitmap(rotated)
        assertMostly(red, pixelAt(rotatedBitmap, rotated, 92f), "rotated gradient start")
        assertMostly(blue, pixelAt(rotatedBitmap, rotated, 88f), "rotated gradient end")
    }

    @Test
    fun hidesTheTrackWhenTheTrackColorIsTransparent() {
        val spec = spec(progress = 0.25f, trackColorArgb = AndroidColor.TRANSPARENT)
        val bitmap = renderArcBitmap(spec)

        assertEquals(0, AndroidColor.alpha(pixelAt(bitmap, spec, 350f)))
        assertMostly(red, pixelAt(bitmap, spec, 140f), "fill near the start")
    }

    @Test
    fun rendersASquareBitmapOfTheRequestedSize() {
        val bitmap = renderArcBitmap(spec(sizePx = 128))

        assertEquals(128, bitmap.width)
        assertEquals(128, bitmap.height)
        assertEquals(Bitmap.Config.ARGB_8888, bitmap.config)
    }

    @Test
    fun rendersAnEmptyBitmapForANonPositiveStroke() {
        val bitmap = renderArcBitmap(spec(progress = 1f, strokePx = 0f))

        assertEquals(0, AndroidColor.alpha(bitmap.getPixel(0, bitmap.height / 2)))
        assertEquals(0, AndroidColor.alpha(bitmap.getPixel(bitmap.width / 2, bitmap.height / 2)))
    }
}
