package voltra.glance.renderers

import android.graphics.Bitmap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ChartBitmapRendererTest {
    // Exchange rate series from the report: five values that differ in their fifth decimal place.
    private val currency: List<List<Any>> =
        listOf(
            listOf("2026-07-02", 0.00056565832),
            listOf("2026-07-03", 0.00056613082),
            listOf("2026-07-04", 0.00057256448),
            listOf("2026-07-05", 0.00057224658),
            listOf("2026-07-06", 0.00057062433),
        )

    // MARK: - Domain

    @Test
    fun framesTheDataRangeForPointMarks() {
        val domain = computeYDomain(currency.map { it[1] as Double }, anchoredAtZero = false)

        assertTrue("domain starts above zero", domain.min > 0.0)
        assertTrue("data fits inside the domain", domain.min < 0.00056565832 && domain.max > 0.00057256448)
        // The data has to cover most of the plot, not the top percent of it.
        val dataShare = (0.00057256448 - 0.00056565832) / (domain.max - domain.min)
        assertTrue("data covers $dataShare of the domain", dataShare > 0.75)
    }

    @Test
    fun keepsTheZeroBaselineForBarAndAreaMarks() {
        val domain = computeYDomain(currency.map { it[1] as Double }, anchoredAtZero = true)

        assertEquals(0.0, domain.min, 0.0)
        assertEquals(0.00057256448, domain.max, 0.0)
    }

    @Test
    fun keepsZeroWhenTheDataNearlyReachesIt() {
        val domain = computeYDomain(listOf(1.0, 10.0), anchoredAtZero = false)

        assertEquals(0.0, domain.min, 0.0)
        assertTrue(domain.max > 10.0)
    }

    @Test
    fun paddingNeverCrossesTheBaseline() {
        val positive = computeYDomain(listOf(0.0, 10.0), anchoredAtZero = false)
        assertEquals(0.0, positive.min, 0.0)

        val negative = computeYDomain(listOf(-10.0, 0.0), anchoredAtZero = false)
        assertEquals(0.0, negative.max, 0.0)
    }

    @Test
    fun padsFlatSeriesRelativeToTheirValue() {
        val domain = computeYDomain(listOf(0.00057, 0.00057), anchoredAtZero = false)

        assertTrue("domain stays near the value", domain.max < 0.001)
        assertTrue("domain has a range to draw in", domain.max > domain.min)
    }

    @Test
    fun ignoresNonFiniteValues() {
        val domain = computeYDomain(listOf(Double.NaN, 2.0, 4.0), anchoredAtZero = false)

        assertTrue(domain.min.isFinite() && domain.max.isFinite())
        assertTrue(domain.min < 2.0 && domain.max > 4.0)
    }

    @Test
    fun fallsBackToAUnitDomainWithoutValues() {
        val domain = computeYDomain(emptyList(), anchoredAtZero = false)

        assertEquals(0.0, domain.min, 0.0)
        assertEquals(1.0, domain.max, 0.0)
    }

    // MARK: - Pinned bounds

    @Test
    fun pinsTheBoundsTheCallerAsksFor() {
        val values = currency.map { it[1] as Double }

        assertEquals(0.0, computeYDomain(values, anchoredAtZero = false, pinned = YScaleOverride(min = 0.0)).min, 0.0)
        assertEquals(
            0.001,
            computeYDomain(values, anchoredAtZero = false, pinned = YScaleOverride(max = 0.001)).max,
            0.0,
        )

        val both = computeYDomain(values, anchoredAtZero = false, pinned = YScaleOverride(0.0005, 0.0006))
        assertEquals(0.0005, both.min, 0.0)
        assertEquals(0.0006, both.max, 0.0)
    }

    @Test
    fun leavesTheOpenSideToTheData() {
        val values = currency.map { it[1] as Double }
        val auto = computeYDomain(values, anchoredAtZero = false)

        val pinned = computeYDomain(values, anchoredAtZero = false, pinned = YScaleOverride(min = 0.0))

        assertEquals(auto.max, pinned.max, 0.0)
    }

    @Test
    fun pinnedBoundsBeatTheZeroAnchor() {
        val values = currency.map { it[1] as Double }

        val domain = computeYDomain(values, anchoredAtZero = true, pinned = YScaleOverride(min = 0.0005))

        assertEquals(0.0005, domain.min, 0.0)
    }

    @Test
    fun keepsARangeToDrawInWhenAPinExcludesTheData() {
        val values = currency.map { it[1] as Double }

        val above = computeYDomain(values, anchoredAtZero = false, pinned = YScaleOverride(min = 0.001))
        assertTrue("domain $above", above.max > above.min)

        val below = computeYDomain(values, anchoredAtZero = false, pinned = YScaleOverride(max = 0.0001))
        assertTrue("domain $below", below.max > below.min)
    }

    @Test
    fun ignoresAnInvertedPin() {
        val values = listOf(1.0, 5.0)

        val domain = computeYDomain(values, anchoredAtZero = false, pinned = YScaleOverride(10.0, 2.0))

        assertEquals(computeYDomain(values, anchoredAtZero = false), domain)
    }

    @Test
    fun parsesThePinnedBoundsProp() {
        assertEquals(YScaleOverride(0.0, 1.0), parseYScale("""{"mn":0,"mx":1}"""))
        assertEquals(YScaleOverride(min = 0.5), parseYScale("""{"min":0.5}"""))
        assertNull(parseYScale("""{}"""))
        assertNull(parseYScale("not json"))
        assertNull(parseYScale(null))
    }

    @Test
    fun keepsPinnedChartsInsideThePlot() {
        val overshooting =
            listOf(
                listOf<Any>("a", 2.0),
                listOf<Any>("b", 6.0),
                listOf<Any>("c", 10.5),
            )

        val bitmap =
            renderChartBitmap(
                marks = listOf(WireMark("point", overshooting, emptyMap())),
                width = 400,
                height = 240,
                yScale = YScaleOverride(0.0, 10.0),
            )

        val rows = rowsWithSeriesColor(bitmap)
        assertTrue("points inside the domain were drawn", rows.isNotEmpty())
        // The plot starts 12px below the top edge; the 10.5 point must not spill above it.
        assertTrue("rows $rows stay inside the plot", rows.first() >= 12)
    }

    // MARK: - Axis labels

    @Test
    fun dropsDecimalsWholeNumberedTicksDoNotNeed() {
        val labels = formatAxisLabels(listOf(100.0, 75.0, 50.0, 25.0, 0.0), step = 25.0)

        assertEquals(listOf("100", "75", "50", "25", "0"), labels)
    }

    @Test
    fun keepsDecimalsThatFractionalTicksNeed() {
        val labels = formatAxisLabels(listOf(10.0, 7.5, 5.0, 2.5, 0.0), step = 2.5)

        assertEquals(listOf("10.0", "7.5", "5.0", "2.5", "0.0"), labels)
    }

    @Test
    fun resolvesTicksOfSmallValues() {
        val domain = computeYDomain(currency.map { it[1] as Double }, anchoredAtZero = false)
        val step = (domain.max - domain.min) / 4
        val ticks = List(5) { i -> domain.min + (domain.max - domain.min) * (4 - i) / 4 }

        val labels = formatAxisLabels(ticks, step)

        assertEquals("every tick reads differently: $labels", labels.size, labels.distinct().size)
        assertTrue(
            "labels show the value: $labels",
            labels.all { it.startsWith("0.00056") || it.startsWith("0.00057") },
        )
    }

    @Test
    fun usesScientificNotationBelowTheDecimalBudget() {
        val labels = formatAxisLabels(listOf(1.2e-9, 1.1e-9, 1.0e-9), step = 1.0e-10)

        assertTrue("labels: $labels", labels.all { it.contains("e") })
        assertEquals(labels.size, labels.distinct().size)
    }

    @Test
    fun rendersTheZeroTickWithoutANegativeSign() {
        val labels = formatAxisLabels(listOf(1.0, 0.5, -0.004), step = 0.5)

        assertEquals(listOf("1.00", "0.50", "0.00"), labels)
    }

    // MARK: - Rendering

    @Test
    fun spreadsSmallValuesAcrossThePlot() {
        val bitmap =
            renderChartBitmap(
                marks = listOf(WireMark("point", currency, emptyMap())),
                width = 400,
                height = 240,
            )

        val rows = rowsWithSeriesColor(bitmap)
        assertTrue("series was drawn", rows.isNotEmpty())
        val spread = rows.last() - rows.first()
        assertTrue("series spans $spread px of 240", spread > 96)
    }

    @Test
    fun keepsBarsOnTheBaseline() {
        val bitmap =
            renderChartBitmap(
                marks = listOf(WireMark("bar", currency, emptyMap())),
                width = 400,
                height = 240,
            )

        val rows = rowsWithSeriesColor(bitmap)
        assertTrue("bars were drawn", rows.isNotEmpty())
        // The x-axis sits 24px above the bottom edge; bars have to reach it.
        assertTrue("lowest bar row ${rows.last()}", rows.last() >= 214)
    }

    @Test
    fun includesRuleValuesInTheDomain() {
        val bitmap =
            renderChartBitmap(
                marks =
                    listOf(
                        WireMark("point", currency, emptyMap()),
                        WireMark("rule", null, mapOf("yv" to 0.0, "c" to "#ff0000")),
                    ),
                width = 400,
                height = 240,
            )

        val ruleRows =
            rowsMatching(bitmap) { pixel ->
                alpha(pixel) > 100 && red(pixel) > 150 && green(pixel) < 80 && blue(pixel) < 80
            }
        assertTrue("rule was drawn", ruleRows.isNotEmpty())
        // Zero is only reachable because the rule joined the domain; the line sits on the x-axis.
        assertTrue("rule rows $ruleRows sit on the baseline", ruleRows.all { it in 205..218 })
    }

    private fun rowsWithSeriesColor(bitmap: Bitmap): List<Int> =
        rowsMatching(bitmap) { pixel -> alpha(pixel) > 200 && blue(pixel) > red(pixel) + 40 }

    private fun rowsMatching(
        bitmap: Bitmap,
        predicate: (Int) -> Boolean,
    ): List<Int> =
        (0 until bitmap.height).filter { y ->
            (0 until bitmap.width).any { x -> predicate(bitmap.getPixel(x, y)) }
        }

    private fun alpha(pixel: Int) = (pixel ushr 24) and 0xFF

    private fun red(pixel: Int) = (pixel shr 16) and 0xFF

    private fun green(pixel: Int) = (pixel shr 8) and 0xFF

    private fun blue(pixel: Int) = pixel and 0xFF
}
