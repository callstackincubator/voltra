package voltra.dynamicwidget

import android.content.Context
import android.icu.util.LocaleData
import android.icu.util.ULocale
import android.os.Build
import android.text.TextUtils
import android.text.format.DateFormat
import android.util.Log
import android.view.View
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import java.util.TimeZone
import android.icu.util.Calendar as IcuCalendar

/**
 * The locale and formatting fields of `WidgetEnvironment` (ADR 0009 §1): everything a JS entry
 * needs to pick a translation and to format dates, numbers and units the way the user expects,
 * read from the configuration the widget renders with.
 */
internal data class DynamicWidgetLocaleEnvironment(
    /** BCP-47 tag of the first configured locale. */
    val locale: String,
    /** Every configured locale, in order: the per-app locales first (Android 13+), then the system's. */
    val preferredLanguages: List<String>,
    /** The app's `setDynamicWidgetLocale` override, if any. */
    val appLocale: String?,
    /** `"ltr"` or `"rtl"`. */
    val layoutDirection: String,
    /** `"h12"` or `"h23"`, from the user's 24-hour setting rather than the locale default. */
    val hourCycle: String,
    val timeZone: String,
    /** `"metric"`, `"us"` or `"uk"`; null below API 28, where UK cannot be told apart. */
    val measurementSystem: String?,
    /** Unicode calendar identifier as `Intl` spells it (`gregory`). */
    val calendar: String?,
    /** 1 = Sunday … 7 = Saturday. */
    val firstDayOfWeek: Int?,
) {
    /** Writes the fields into [env]; absent optionals are left out so JS reads `undefined`. */
    fun putInto(env: JSONObject): JSONObject {
        env.put("locale", locale)
        env.put("preferredLanguages", JSONArray(preferredLanguages))
        appLocale?.let { env.put("appLocale", it) }
        env.put("layoutDirection", layoutDirection)
        env.put("hourCycle", hourCycle)
        env.put("timeZone", timeZone)
        measurementSystem?.let { env.put("measurementSystem", it) }
        calendar?.let { env.put("calendar", it) }
        firstDayOfWeek?.let { env.put("firstDayOfWeek", it) }
        return env
    }

    companion object {
        private const val TAG = "DynamicWidgetLocaleEnv"

        fun capture(context: Context): DynamicWidgetLocaleEnvironment {
            val locales = context.resources.configuration.locales
            val tags = (0 until locales.size()).map { locales[it].toLanguageTag() }
            val primary: Locale = if (locales.isEmpty) Locale.getDefault() else locales[0]
            val rtl = TextUtils.getLayoutDirectionFromLocale(primary) == View.LAYOUT_DIRECTION_RTL

            return DynamicWidgetLocaleEnvironment(
                locale = primary.toLanguageTag(),
                preferredLanguages = tags.ifEmpty { listOf(primary.toLanguageTag()) },
                appLocale = DynamicWidgetLocaleStore(context).get(),
                layoutDirection = if (rtl) "rtl" else "ltr",
                hourCycle = if (DateFormat.is24HourFormat(context)) "h23" else "h12",
                timeZone = TimeZone.getDefault().id,
                measurementSystem = measurementSystem(primary),
                calendar = calendarIdentifier(primary),
                firstDayOfWeek = firstDayOfWeek(primary),
            )
        }

        /**
         * `LocaleData.MeasurementSystem.UK` only exists from API 28; below that a British user
         * would be reported as metric, so the field is left out instead of guessed.
         */
        private fun measurementSystem(locale: Locale): String? {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return null
            return try {
                when (LocaleData.getMeasurementSystem(ULocale.forLocale(locale))) {
                    LocaleData.MeasurementSystem.US -> "us"
                    LocaleData.MeasurementSystem.UK -> "uk"
                    else -> "metric"
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not read the measurement system: ${e.message}")
                null
            }
        }

        private fun calendarIdentifier(locale: Locale): String? =
            try {
                intlCalendarIdentifier(IcuCalendar.getInstance(ULocale.forLocale(locale)).type)
            } catch (e: Exception) {
                Log.w(TAG, "Could not read the calendar type: ${e.message}")
                null
            }

        private fun firstDayOfWeek(locale: Locale): Int? =
            java.util.Calendar
                .getInstance(locale)
                .firstDayOfWeek
                .takeIf { it in 1..7 }

        /** ICU spells CLDR calendar types the long way; `Intl` and BCP-47 use the short keys. */
        fun intlCalendarIdentifier(icuType: String?): String? =
            when (icuType) {
                null, "" -> null
                "gregorian" -> "gregory"
                "ethiopic-amete-alem" -> "ethioaa"
                else -> icuType
            }
    }
}
