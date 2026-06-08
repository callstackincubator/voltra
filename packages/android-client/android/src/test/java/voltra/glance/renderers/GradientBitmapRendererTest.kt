package voltra.glance.renderers

import android.content.Context
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.GraphicsMode
import voltra.styling.BackgroundImageValue
import voltra.styling.GradientStop
import voltra.styling.LayoutStyle
import voltra.styling.SizeValue
import voltra.styling.UnitPoint
import voltra.styling.VoltraColorValue
import android.graphics.Color as AndroidColor
import androidx.compose.ui.graphics.Color as ComposeColor

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class GradientBitmapRendererTest {
    private val context: Context
        get() = RuntimeEnvironment.getApplication()

    @Test
    fun rendersHorizontalLinearGradient() {
        val bitmap =
            renderGradientBitmap(
                context = context,
                gradient =
                    linearGradient(
                        startPoint = UnitPoint(0f, 0.5f),
                        endPoint = UnitPoint(1f, 0.5f),
                    ),
                layout = fixedLayout(12, 4),
                widgetSize = null,
                backgroundArgb = 0x00000000,
                colors = colors(ComposeColor.Red.toArgb(), ComposeColor.Blue.toArgb()),
                positions = positions(0f, 1f),
            )

        assertMostlyRed(bitmap.getPixel(0, 2))
        assertMostlyBlue(bitmap.getPixel(bitmap.width - 1, 2))
    }

    @Test
    fun rendersVerticalLinearGradient() {
        val bitmap =
            renderGradientBitmap(
                context = context,
                gradient =
                    linearGradient(
                        startPoint = UnitPoint(0.5f, 0f),
                        endPoint = UnitPoint(0.5f, 1f),
                    ),
                layout = fixedLayout(4, 12),
                widgetSize = null,
                backgroundArgb = 0x00000000,
                colors = colors(ComposeColor.Red.toArgb(), ComposeColor.Blue.toArgb()),
                positions = positions(0f, 1f),
            )

        assertMostlyRed(bitmap.getPixel(2, 0))
        assertMostlyBlue(bitmap.getPixel(2, bitmap.height - 1))
    }

    @Test
    fun paintsBackgroundColorBehindTransparentGradient() {
        val bitmap =
            renderGradientBitmap(
                context = context,
                gradient =
                    BackgroundImageValue.LinearGradient(
                        startPoint = UnitPoint(0f, 0.5f),
                        endPoint = UnitPoint(1f, 0.5f),
                        stops = listOf(stop(ComposeColor.Transparent, 0f), stop(ComposeColor.Transparent, 1f)),
                    ),
                layout = fixedLayout(4, 4),
                widgetSize = null,
                backgroundArgb = ComposeColor.Green.toArgb(),
                colors = colors(ComposeColor.Transparent.toArgb(), ComposeColor.Transparent.toArgb()),
                positions = positions(0f, 1f),
            )

        assertMostlyGreen(bitmap.getPixel(2, 2))
    }

    @Test
    fun rendersRadialGradientCenterAndEdge() {
        val parsed =
            requireNotNull(
                voltra.styling.JSGradientParser.parse("radial-gradient(circle at center, red 0%, blue 100%)"),
            )
        val bitmap =
            renderGradientBitmap(
                context = context,
                gradient = parsed,
                layout = fixedLayout(15, 15),
                widgetSize = null,
                backgroundArgb = 0x00000000,
                colors = colors(ComposeColor.Red.toArgb(), ComposeColor.Blue.toArgb()),
                positions = positions(0f, 1f),
            )

        assertMostlyRed(bitmap.getPixel(bitmap.width / 2, bitmap.height / 2))
        assertMostlyBlue(bitmap.getPixel(0, 0))
    }

    @Test
    fun rendersConicGradientWithDifferentQuadrants() {
        val parsed =
            requireNotNull(
                voltra.styling.JSGradientParser.parse(
                    "conic-gradient(from 0deg at center, red 0%, red 25%, blue 25%, blue 100%)",
                ),
            )
        val bitmap =
            renderGradientBitmap(
                context = context,
                gradient = parsed,
                layout = fixedLayout(21, 21),
                widgetSize = null,
                backgroundArgb = 0x00000000,
                colors =
                    colors(
                        ComposeColor.Red.toArgb(),
                        ComposeColor.Red.toArgb(),
                        ComposeColor.Blue.toArgb(),
                        ComposeColor.Blue.toArgb(),
                    ),
                positions = positions(0f, 0.25f, 0.25f, 1f),
            )

        assertMostlyRed(bitmap.getPixel(bitmap.width / 2, 1))
        assertMostlyBlue(bitmap.getPixel(bitmap.width - 2, bitmap.height / 2))
    }

    @Test
    fun capsLargeBitmapSize() {
        val bitmap =
            renderGradientBitmap(
                context = context,
                gradient =
                    linearGradient(
                        startPoint = UnitPoint(0f, 0.5f),
                        endPoint = UnitPoint(1f, 0.5f),
                    ),
                layout = fixedLayout(2000, 2000),
                widgetSize = null,
                backgroundArgb = 0x00000000,
                colors = colors(ComposeColor.Red.toArgb(), ComposeColor.Blue.toArgb()),
                positions = positions(0f, 1f),
            )

        assertTrue(bitmap.width <= 768)
        assertTrue(bitmap.height <= 768)
        assertTrue(bitmap.width * bitmap.height <= 512 * 512)
    }

    private fun fixedLayout(
        width: Int,
        height: Int,
    ): LayoutStyle =
        LayoutStyle(
            width = SizeValue.Fixed(width.dp),
            height = SizeValue.Fixed(height.dp),
        )

    private fun stop(
        color: ComposeColor,
        location: Float,
    ): GradientStop = GradientStop(VoltraColorValue.Static(color), location)

    private fun linearGradient(
        startPoint: UnitPoint,
        endPoint: UnitPoint,
    ): BackgroundImageValue.LinearGradient =
        BackgroundImageValue.LinearGradient(
            startPoint = startPoint,
            endPoint = endPoint,
            stops = listOf(stop(ComposeColor.Red, 0f), stop(ComposeColor.Blue, 1f)),
        )

    private fun colors(vararg colors: Int): IntArray = colors

    private fun positions(vararg positions: Float): FloatArray = positions

    private fun assertMostlyRed(color: Int) {
        assertTrue(
            "Expected mostly red, got ${describeColor(color)}",
            AndroidColor.red(color) > 180 && AndroidColor.blue(color) < 90,
        )
    }

    private fun assertMostlyBlue(color: Int) {
        assertTrue(
            "Expected mostly blue, got ${describeColor(color)}",
            AndroidColor.blue(color) > 180 && AndroidColor.red(color) < 90,
        )
    }

    private fun assertMostlyGreen(color: Int) {
        assertTrue(
            "Expected mostly green, got ${describeColor(color)}",
            AndroidColor.green(color) > 180 && AndroidColor.red(color) < 90,
        )
    }

    private fun describeColor(color: Int): String =
        "a=${AndroidColor.alpha(
            color,
        )}, r=${AndroidColor.red(color)}, g=${AndroidColor.green(color)}, b=${AndroidColor.blue(color)}"
}
