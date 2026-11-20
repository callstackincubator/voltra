package voltra.styling

import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import voltra.glance.GlanceRenderHelper
import voltra.glance.GlanceRenderHelper.Scheme
import voltra.glance.applyUnder
import voltra.glance.backgroundColors
import voltra.glance.textColors

@RunWith(RobolectricTestRunner::class)
class StyleModifiersTest {
    private val white = 0xFFFFFFFF.toInt()
    private val black = 0xFF000000.toInt()

    // A Column with a pair background holding a Text with the opposite pair as its color.
    private val card =
        """
        {"t":9,"p":{"s":{"bg":{"day":"#ffffff","night":"#000000"}}},
         "c":{"t":18,"c":"Hi","p":{"s":{"c":{"day":"#000000","night":"#ffffff"}}}}}
        """.trimIndent()

    @Test
    @Config(sdk = [31])
    fun launcherSwapsBothColorsWithoutRecomposingFromAndroid12() {
        val views = GlanceRenderHelper.compose(GlanceRenderHelper.node(card), Scheme.DAY)

        val day = views.applyUnder(Scheme.DAY)
        assertEquals(listOf(white), day.backgroundColors())
        assertEquals(black, day.textColors()["Hi"])

        val night = views.applyUnder(Scheme.NIGHT)
        assertEquals(listOf(black), night.backgroundColors())
        assertEquals(white, night.textColors()["Hi"])
    }

    @Test
    @Config(sdk = [26])
    fun recompositionPicksTheSideBeforeAndroid12() {
        val day = GlanceRenderHelper.render(card, composeUnder = Scheme.DAY)
        assertEquals(listOf(white), day.backgroundColors())
        assertEquals(black, day.textColors()["Hi"])

        val night = GlanceRenderHelper.render(card, composeUnder = Scheme.NIGHT)
        assertEquals(listOf(black), night.backgroundColors())
        assertEquals(white, night.textColors()["Hi"])

        // The side is baked in when composing: a scheme flip needs a native recomposition.
        val stale = GlanceRenderHelper.render(card, composeUnder = Scheme.DAY, applyUnder = Scheme.NIGHT)
        assertEquals(listOf(white), stale.backgroundColors())
    }

    @Test
    fun aPairReachesEveryStyleColorKeyWithoutError() {
        val pair = """{"day":"#ffffff","night":"#000000"}"""
        val json =
            """
            {"t":9,"p":{"s":{"bg":$pair,"bw":1,"bc":$pair,"shr":2,"shc":$pair}},
             "c":{"t":18,"c":"Hi","p":{"s":{"c":{"day":"#000000","night":"#ffffff"}}}}}
            """.trimIndent()

        val day = GlanceRenderHelper.render(json, composeUnder = Scheme.DAY)
        val night = GlanceRenderHelper.render(json, composeUnder = Scheme.NIGHT)

        assertEquals(listOf(white), day.backgroundColors())
        assertEquals(black, day.textColors()["Hi"])
        assertEquals(listOf(black), night.backgroundColors())
        assertEquals(white, night.textColors()["Hi"])
    }

    @Test
    fun anInvalidPairFallsBackToTheDefault() {
        val json = """{"t":9,"p":{"s":{"bg":{"day":"~p","night":"#000000"}}},"c":{"t":18,"c":"Hi"}}"""

        val view = GlanceRenderHelper.render(json, composeUnder = Scheme.NIGHT)

        assertEquals(emptyList<Int>(), view.backgroundColors())
    }
}
