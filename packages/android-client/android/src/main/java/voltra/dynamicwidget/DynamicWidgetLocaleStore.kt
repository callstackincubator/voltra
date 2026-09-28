package voltra.dynamicwidget

import android.content.Context
import android.content.SharedPreferences

/**
 * The language the app asked Voltra to render Dynamic Widgets in (`setDynamicWidgetLocale`),
 * surfaced to the JS entry as `env.appLocale` (ADR 0009 §3).
 *
 * Widgets render in the app process on Android, so plain SharedPreferences are enough; the value
 * outlives the process so a widget re-rendered by WorkManager or the launcher still sees it.
 */
internal class DynamicWidgetLocaleStore(
    context: Context,
) {
    private val preferences: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    /** The stored BCP-47 tag, or null when the app has not set one. */
    fun get(): String? = preferences.getString(KEY_LOCALE, null)?.takeIf { it.isNotBlank() }

    /** Stores [tag], or clears the override when [tag] is null or blank. */
    fun set(tag: String?) {
        val editor = preferences.edit()
        if (tag.isNullOrBlank()) {
            editor.remove(KEY_LOCALE)
        } else {
            editor.putString(KEY_LOCALE, tag)
        }
        editor.commit()
    }

    private companion object {
        const val PREFERENCES_NAME = "voltra_dynamic_widget_locale"
        const val KEY_LOCALE = "locale"
    }
}
