package voltra.dynamicwidget

import android.content.res.Configuration
import android.content.res.Configuration.UI_MODE_NIGHT_NO
import android.content.res.Configuration.UI_MODE_NIGHT_YES
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.glance.color.ColorProviders
import androidx.glance.color.colorProviders
import androidx.glance.unit.ColorProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.shadows.ShadowLog

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetThemeTest {
    @Before
    fun clearLogs() {
        ShadowLog.clear()
    }

    @Test
    fun noThemeJsonIsNoThemeAndLogsNothing() {
        assertNull(DynamicWidgetTheme.parse(null))
        assertTrue(ShadowLog.getLogs().none { it.tag == "DynamicWidgetTheme" })
    }

    @Test
    fun aValidThemeGivesEachDefinedRoleItsDayAndNightColor() {
        val theme =
            DynamicWidgetTheme.parse(
                """
                {
                  "day": { "primary": "#6750A4", "surface": "rgb(255, 251, 254)" },
                  "night": { "primary": "#D0BCFF", "surface": "black" },
                  "dynamicColors": false
                }
                """.trimIndent(),
            )!!

        val colors = theme.toColorProviders(fallback)

        assertEquals(0xFF6750A4.toInt(), colors.primary.under(UI_MODE_NIGHT_NO))
        assertEquals(0xFFD0BCFF.toInt(), colors.primary.under(UI_MODE_NIGHT_YES))
        assertEquals(0xFFFFFBFE.toInt(), colors.surface.under(UI_MODE_NIGHT_NO))
        assertEquals(0xFF000000.toInt(), colors.surface.under(UI_MODE_NIGHT_YES))
        assertFalse(theme.dynamicColors)
    }

    @Test
    fun rolesAPartialThemeLeavesOutKeepTheFallbackPalette() {
        val theme =
            DynamicWidgetTheme.parse("""{"day":{"tertiary":"#00FF00"},"night":{"tertiary":"#008800"}}""")!!

        val colors = theme.toColorProviders(fallback)

        assertEquals(0xFF00FF00.toInt(), colors.tertiary.under(UI_MODE_NIGHT_NO))
        assertSame(fallback.primary, colors.primary)
        assertSame(fallback.widgetBackground, colors.widgetBackground)
        assertSame(fallback.onErrorContainer, colors.onErrorContainer)
    }

    @Test
    fun dynamicColorsDefaultsToTrue() {
        val theme = DynamicWidgetTheme.parse("""{"day":{},"night":{}}""")!!

        assertTrue(theme.dynamicColors)
    }

    @Test
    fun aThemeThatIsNotAnObjectIsIgnoredWithOneWarning() {
        // The first three are the strings Metro sends for a function, a Symbol and a cyclic theme.
        val cases =
            listOf(
                "\"function\"",
                "\"symbol\"",
                "\"Converting circular structure to JSON\"",
                "[]",
                "42",
                "null",
                "not json",
            )

        for (json in cases) {
            ShadowLog.clear()

            assertNull(json, DynamicWidgetTheme.parse(json))
            assertEquals(json, 1, warnings().size)
        }
    }

    @Test
    fun aThemeWhoseDayOrNightIsNotAnObjectIsIgnoredWithOneWarning() {
        val cases =
            listOf(
                """{"day":"#ffffff","night":{}}""",
                """{"day":{},"night":["#000000"]}""",
                """{"day":{}}""",
                """{"night":{}}""",
            )

        for (json in cases) {
            ShadowLog.clear()

            assertNull(json, DynamicWidgetTheme.parse(json))
            assertEquals(json, 1, warnings().size)
        }
    }

    @Test
    fun aRoleThatCannotBeUsedOnBothSidesIsDroppedWithOneWarning() {
        val cases =
            mapOf(
                "one-sided" to """{"day":{"primary":"#00FF00"},"night":{}}""",
                "night only" to """{"day":{},"night":{"primary":"#00FF00"}}""",
                "unparsable side" to """{"day":{"primary":"not-a-color"},"night":{"primary":"#00FF00"}}""",
                "unparsable on both sides" to """{"day":{"primary":"nope"},"night":{"primary":"nope"}}""",
                "role token" to """{"day":{"primary":"~s"},"night":{"primary":"#00FF00"}}""",
                "pair" to """{"day":{"primary":{"day":"#000000","night":"#FFFFFF"}},"night":{"primary":"#00FF00"}}""",
                "number" to """{"day":{"primary":255},"night":{"primary":"#00FF00"}}""",
            )

        for ((name, json) in cases) {
            ShadowLog.clear()

            val theme = DynamicWidgetTheme.parse(json)

            assertSame(name, fallback.primary, theme!!.toColorProviders(fallback).primary)
            assertEquals(name, 1, warnings().size)
            assertTrue(name, warnings().single().contains("primary"))
        }
    }

    @Test
    fun aRoleMalformedOnBothSidesWarnsNoMoreThanOneMalformedOnOneSide() {
        // The color parser adds its own warning for a malformed hex until it has a quiet path, so
        // compare the two cases rather than asserting a total.
        fun warningsFor(json: String): List<String> {
            ShadowLog.clear()
            DynamicWidgetTheme.parse(json)
            return warnings()
        }

        val oneSide = warningsFor("""{"day":{"primary":"#zzzzzz"},"night":{"primary":"#00FF00"}}""")
        val bothSides = warningsFor("""{"day":{"primary":"#zzzzzz"},"night":{"primary":"#yyyyyy"}}""")

        assertEquals(oneSide.size, bothSides.size)
        assertEquals(1, bothSides.count { it.startsWith("Ignoring theme role primary") })
    }

    @Test
    fun aDroppedRoleLeavesTheOtherRolesThemed() {
        val theme =
            DynamicWidgetTheme.parse(
                """{"day":{"primary":"#00FF00","surface":"#FFFFFF"},"night":{"surface":"#000000"}}""",
            )!!

        assertEquals(0xFF000000.toInt(), theme.toColorProviders(fallback).surface.under(UI_MODE_NIGHT_YES))
        assertEquals(1, warnings().size)
    }

    /** Every warning (or worse) logged by anyone: a malformed theme must cost exactly one. */
    private fun warnings(): List<String> =
        ShadowLog.getLogs().filter { it.type >= android.util.Log.WARN }.map { it.msg }

    private fun ColorProvider.under(nightMode: Int): Int {
        val app = RuntimeEnvironment.getApplication()
        val configuration =
            Configuration(app.resources.configuration).apply {
                uiMode = (uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or nightMode
            }
        return getColor(app.createConfigurationContext(configuration)).toArgb()
    }

    private val fallback: ColorProviders =
        colorProviders(
            primary = ColorProvider(Color(0xFF000001)),
            onPrimary = ColorProvider(Color(0xFF000002)),
            primaryContainer = ColorProvider(Color(0xFF000003)),
            onPrimaryContainer = ColorProvider(Color(0xFF000004)),
            secondary = ColorProvider(Color(0xFF000005)),
            onSecondary = ColorProvider(Color(0xFF000006)),
            secondaryContainer = ColorProvider(Color(0xFF000007)),
            onSecondaryContainer = ColorProvider(Color(0xFF000008)),
            tertiary = ColorProvider(Color(0xFF000009)),
            onTertiary = ColorProvider(Color(0xFF00000A)),
            tertiaryContainer = ColorProvider(Color(0xFF00000B)),
            onTertiaryContainer = ColorProvider(Color(0xFF00000C)),
            error = ColorProvider(Color(0xFF00000D)),
            errorContainer = ColorProvider(Color(0xFF00000E)),
            onError = ColorProvider(Color(0xFF00000F)),
            onErrorContainer = ColorProvider(Color(0xFF000010)),
            background = ColorProvider(Color(0xFF000011)),
            onBackground = ColorProvider(Color(0xFF000012)),
            surface = ColorProvider(Color(0xFF000013)),
            onSurface = ColorProvider(Color(0xFF000014)),
            surfaceVariant = ColorProvider(Color(0xFF000015)),
            onSurfaceVariant = ColorProvider(Color(0xFF000016)),
            outline = ColorProvider(Color(0xFF000017)),
            inverseOnSurface = ColorProvider(Color(0xFF000018)),
            inverseSurface = ColorProvider(Color(0xFF000019)),
            inversePrimary = ColorProvider(Color(0xFF00001A)),
            widgetBackground = ColorProvider(Color(0xFF00001B)),
        )
}
