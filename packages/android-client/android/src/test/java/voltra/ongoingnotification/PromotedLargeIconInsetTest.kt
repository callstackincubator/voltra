package voltra.ongoingnotification

import android.graphics.Rect
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PromotedLargeIconInsetTest {
    // 16dp inset on a 36dp icon, as on Samsung One UI 8.
    private val ratio = 16f / 36f

    @Test
    fun squareImageGetsTransparentEndPadding() {
        val layout = PromotedLargeIconInset.computeLayout(360, 360, ratio, isRtl = false, maxHeight = 720)!!

        assertEquals(520, layout.canvasWidth)
        assertEquals(360, layout.canvasHeight)
        assertEquals(Rect(0, 0, 360, 360), layout.sourceCrop)
        assertEquals(0, layout.contentLeft)
        assertEquals(0, layout.contentTop)
        assertEquals(360, layout.contentWidth)
        assertEquals(360, layout.contentHeight)
    }

    @Test
    fun rtlPutsPaddingOnTheLeft() {
        val layout = PromotedLargeIconInset.computeLayout(360, 360, ratio, isRtl = true, maxHeight = 720)!!

        assertEquals(160, layout.contentLeft)
        assertEquals(360, layout.contentWidth)
    }

    @Test
    fun tallImageIsCroppedToTheSquareTheSystemWouldShow() {
        val layout = PromotedLargeIconInset.computeLayout(360, 720, ratio, isRtl = false, maxHeight = 720)!!

        assertEquals(Rect(0, 180, 360, 540), layout.sourceCrop)
        assertEquals(520, layout.canvasWidth)
        assertEquals(360, layout.canvasHeight)
        assertEquals(360, layout.contentWidth)
        assertEquals(360, layout.contentHeight)
    }

    @Test
    fun landscapeImageThatFitsKeepsItsSize() {
        val layout = PromotedLargeIconInset.computeLayout(450, 360, ratio, isRtl = false, maxHeight = 720)!!

        assertEquals(Rect(0, 0, 450, 360), layout.sourceCrop)
        assertEquals(610, layout.canvasWidth)
        assertEquals(450, layout.contentWidth)
        assertEquals(360, layout.contentHeight)
        assertEquals(0, layout.contentTop)
    }

    @Test
    fun wideImageShrinksToKeepTheCanvasWithin16By9() {
        val layout = PromotedLargeIconInset.computeLayout(1600, 900, ratio, isRtl = false, maxHeight = 2000)!!

        assertEquals(Rect(0, 0, 1600, 900), layout.sourceCrop)
        assertEquals(1600, layout.canvasWidth)
        assertEquals(900, layout.canvasHeight)
        assertEquals(1200, layout.contentWidth)
        assertEquals(675, layout.contentHeight)
        assertEquals(113, layout.contentTop)
    }

    @Test
    fun panoramaIsCroppedTo16By9First() {
        val layout = PromotedLargeIconInset.computeLayout(3200, 900, ratio, isRtl = false, maxHeight = 2000)!!

        assertEquals(Rect(800, 0, 2400, 900), layout.sourceCrop)
        assertEquals(1600, layout.canvasWidth)
    }

    @Test
    fun largeImagesAreDownscaledToMaxHeight() {
        val layout = PromotedLargeIconInset.computeLayout(2000, 2000, ratio, isRtl = false, maxHeight = 200)!!

        assertEquals(200, layout.canvasHeight)
        assertEquals(289, layout.canvasWidth)
        assertEquals(200, layout.contentWidth)
    }

    @Test
    fun invalidInputReturnsNull() {
        assertNull(PromotedLargeIconInset.computeLayout(0, 100, ratio, isRtl = false, maxHeight = 200))
        assertNull(PromotedLargeIconInset.computeLayout(100, 100, 0f, isRtl = false, maxHeight = 200))
    }
}
