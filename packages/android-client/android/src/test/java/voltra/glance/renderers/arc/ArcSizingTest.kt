package voltra.glance.renderers.arc

import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import voltra.styling.SizeValue

class ArcSizingTest {
    @Test
    fun usesTheSmallerOfAFixedWidthAndHeight() {
        val size =
            resolveArcSize(
                width = SizeValue.Fixed(120.dp),
                height = SizeValue.Fixed(80.dp),
                widgetSize = DpSize(300.dp, 200.dp),
                density = 2f,
            )

        assertEquals(160, size.sizePx)
        assertEquals(2f, size.scale, 0.001f)
    }

    @Test
    fun usesTheSmallerWidgetDimensionWhenTheStyleSaysFill() {
        val size =
            resolveArcSize(
                width = SizeValue.Fill,
                height = SizeValue.Fill,
                widgetSize = DpSize(180.dp, 100.dp),
                density = 1f,
            )

        assertEquals(100, size.sizePx)
    }

    @Test
    fun mixesAFixedEdgeWithAFilledEdge() {
        val size =
            resolveArcSize(
                width = SizeValue.Fill,
                height = SizeValue.Fixed(40.dp),
                widgetSize = DpSize(180.dp, 100.dp),
                density = 1f,
            )

        assertEquals(40, size.sizePx)
    }

    @Test
    fun fallsBackToTheDefaultEdgeWhenNothingIsKnown() {
        val size =
            resolveArcSize(
                width = SizeValue.Wrap,
                height = null,
                widgetSize = null,
                density = 1f,
            )

        assertEquals(DEFAULT_ARC_SIZE_DP.toInt(), size.sizePx)
    }

    @Test
    fun fallsBackToTheDefaultEdgeWhenFillHasNoWidgetSize() {
        val size =
            resolveArcSize(
                width = SizeValue.Fill,
                height = SizeValue.Fill,
                widgetSize = null,
                density = 1f,
            )

        assertEquals(DEFAULT_ARC_SIZE_DP.toInt(), size.sizePx)
    }

    @Test
    fun clampsTheDensityMultiplierAtBothEnds() {
        val low =
            resolveArcSize(
                width = SizeValue.Fixed(100.dp),
                height = SizeValue.Fixed(100.dp),
                widgetSize = null,
                density = 0.75f,
            )
        assertEquals(100, low.sizePx)
        assertEquals(MIN_ARC_DENSITY_SCALE, low.scale, 0.001f)

        val high =
            resolveArcSize(
                width = SizeValue.Fixed(100.dp),
                height = SizeValue.Fixed(100.dp),
                widgetSize = null,
                density = 4f,
            )
        assertEquals(350, high.sizePx)
        assertEquals(MAX_ARC_DENSITY_SCALE, high.scale, 0.001f)
    }

    @Test
    fun capsTheBitmapEdgeAndReportsTheDegradedScale() {
        val size =
            resolveArcSize(
                width = SizeValue.Fixed(400.dp),
                height = SizeValue.Fixed(400.dp),
                widgetSize = null,
                density = 3f,
            )

        assertEquals(MAX_ARC_EDGE_PX, size.sizePx)
        // The scale degrades below the density so strokes keep their proportion to the arc.
        assertEquals(MAX_ARC_EDGE_PX / 400f, size.scale, 0.001f)
        assertTrue(size.scale < 3f)
    }

    @Test
    fun ignoresNonPositiveEdges() {
        val size =
            resolveArcSize(
                width = SizeValue.Fixed(0.dp),
                height = SizeValue.Fixed(50.dp),
                widgetSize = null,
                density = 1f,
            )

        assertEquals(50, size.sizePx)
    }
}
