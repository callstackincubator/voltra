package voltra.dynamicwidget

import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/** The locale fields of `WidgetEnvironment` on Android (ADR 0009 §1). */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetLocaleEnvironmentTest {
    private val context get() = RuntimeEnvironment.getApplication()

    @After
    fun clearOverride() {
        DynamicWidgetLocaleStore(context).set(null)
    }

    @Test
    @Config(qualifiers = "pl-rPL")
    fun reportsTheConfiguredLocaleAsBcp47() {
        val env = DynamicWidgetLocaleEnvironment.capture(context)

        assertEquals("pl-PL", env.locale)
        assertEquals("pl-PL", env.preferredLanguages.first())
        assertEquals("ltr", env.layoutDirection)
        assertEquals(2, env.firstDayOfWeek)
        assertEquals("gregory", env.calendar)
        assertNull(env.appLocale)
    }

    @Test
    @Config(qualifiers = "ar-rEG")
    fun reportsRightToLeftForArabic() {
        assertEquals("rtl", DynamicWidgetLocaleEnvironment.capture(context).layoutDirection)
    }

    @Test
    @Config(qualifiers = "en-rUS", sdk = [34])
    fun reportsTheUsMeasurementSystemFromApi28() {
        assertEquals("us", DynamicWidgetLocaleEnvironment.capture(context).measurementSystem)
    }

    @Test
    @Config(qualifiers = "en-rGB", sdk = [26])
    fun omitsTheMeasurementSystemBelowApi28() {
        assertNull(DynamicWidgetLocaleEnvironment.capture(context).measurementSystem)
    }

    @Test
    fun surfacesTheAppOverride() {
        DynamicWidgetLocaleStore(context).set("pt-BR")

        assertEquals("pt-BR", DynamicWidgetLocaleEnvironment.capture(context).appLocale)

        DynamicWidgetLocaleStore(context).set(null)

        assertNull(DynamicWidgetLocaleEnvironment.capture(context).appLocale)
    }

    @Test
    fun writesJsonAndLeavesAbsentFieldsOut() {
        val env =
            DynamicWidgetLocaleEnvironment(
                locale = "pl-PL",
                preferredLanguages = listOf("pl-PL", "en-US"),
                appLocale = null,
                layoutDirection = "ltr",
                hourCycle = "h23",
                timeZone = "Europe/Warsaw",
                measurementSystem = null,
                calendar = "gregory",
                firstDayOfWeek = 2,
            ).putInto(JSONObject())

        assertEquals("pl-PL", env.getString("locale"))
        assertEquals("en-US", env.getJSONArray("preferredLanguages").getString(1))
        assertEquals("h23", env.getString("hourCycle"))
        assertEquals("Europe/Warsaw", env.getString("timeZone"))
        assertEquals(2, env.getInt("firstDayOfWeek"))
        assertFalse(env.has("appLocale"))
        assertFalse(env.has("measurementSystem"))
    }

    @Test
    fun mapsIcuCalendarTypesToIntlIdentifiers() {
        assertEquals("gregory", DynamicWidgetLocaleEnvironment.intlCalendarIdentifier("gregorian"))
        assertEquals("ethioaa", DynamicWidgetLocaleEnvironment.intlCalendarIdentifier("ethiopic-amete-alem"))
        assertEquals("japanese", DynamicWidgetLocaleEnvironment.intlCalendarIdentifier("japanese"))
        assertNull(DynamicWidgetLocaleEnvironment.intlCalendarIdentifier(""))
    }
}
