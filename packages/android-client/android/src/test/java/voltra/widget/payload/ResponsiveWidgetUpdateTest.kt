package voltra.widget.payload

import android.util.SizeF
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Below API 31 we resolve the size mapping ourselves instead of handing it to
 * `RemoteViews(Map<SizeF, RemoteViews>)`. These cover that selection against the rules the
 * platform applies in `RemoteViews.findBestFitLayout`, so the variant shown on API 24-30 matches
 * the one API 31+ would pick for the same mapping.
 */
@RunWith(RobolectricTestRunner::class)
class ResponsiveWidgetUpdateTest {
    private val small = SizeF(120f, 120f)
    private val wide = SizeF(199f, 80f)
    private val large = SizeF(300f, 300f)

    private val variants = mapOf(small to "small", wide to "wide", large to "large")

    @Test
    fun picksTheFittingVariantClosestToTheBoxRatherThanTheLargestOne() {
        // Both fit a 200x200 box, and `wide` has the greater area - but `small` is closer, which
        // is what the platform picks. Selecting by area would disagree with API 31+ here.
        assertEquals("small", bestFitVariant(variants, boxWidth = 200, boxHeight = 200))
    }

    @Test
    fun picksTheWideVariantWhenTheBoxIsWideAndShort() {
        assertEquals("wide", bestFitVariant(variants, boxWidth = 210, boxHeight = 90))
    }

    @Test
    fun fallsBackToTheSmallestVariantWhenNothingFits() {
        assertEquals("small", bestFitVariant(variants, boxWidth = 50, boxHeight = 50))
    }

    @Test
    fun fallsBackToTheSmallestVariantWhenTheLauncherHasNotReportedBoundsYet() {
        // The options bundle is empty on the first update after a widget is added.
        assertEquals("small", bestFitVariant(variants, boxWidth = 0, boxHeight = 0))
    }

    @Test
    fun allowsTheSameOneDpRoundingToleranceAsThePlatform() {
        // `RemoteViews.fitsIn` treats a variant as fitting when box + 1 > variant.
        val exact = mapOf(SizeF(201f, 201f) to "just-over")
        assertEquals("just-over", bestFitVariant(exact, boxWidth = 200, boxHeight = 200))
    }

    @Test
    fun prefersAnExactMatchOverASmallerFittingVariant() {
        assertEquals("large", bestFitVariant(variants, boxWidth = 300, boxHeight = 300))
    }
}
