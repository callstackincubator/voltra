package voltra.widget

import android.content.res.Resources
import android.os.Build
import org.json.JSONObject

/**
 * Locale selection for the plugin-prerendered `voltra_initial_states.json` asset, shared by the
 * payload-driven placeholder reader ([VoltraWidgetManager]) and the Dynamic Widget placeholder
 * reader (`voltra.dynamicwidget.DynamicWidgetPlaceholderStore`). Both kinds read the same asset
 * format, so the selection logic lives here once instead of being duplicated per kind.
 *
 * Keys must match `@use-voltra/android-client` expo-plugin `initialStates.ts`.
 */
internal object InitialStateLocalePicker {
    const val LOCALIZED_INITIAL_STATE_KEY = "__voltraLocales"

    /**
     * Legacy flat payload vs localized `{ "__voltraLocales": { "en": {...}, "pl": {...} } }`.
     */
    fun resolveInitialStatePayload(
        obj: JSONObject,
        res: Resources,
    ): String {
        if (!obj.has(LOCALIZED_INITIAL_STATE_KEY)) {
            return obj.toString()
        }
        val perLocale = obj.optJSONObject(LOCALIZED_INITIAL_STATE_KEY) ?: return obj.toString()
        val picked = pickLocalizedPayload(perLocale, preferredLanguageTags(res)) ?: return obj.toString()
        return picked.toString()
    }

    fun preferredLanguageTags(res: Resources): List<String> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val locales = res.configuration.locales
            (0 until locales.size()).map { locales[it].toLanguageTag() }
        } else {
            @Suppress("DEPRECATION")
            listOf(res.configuration.locale.toLanguageTag())
        }

    fun normalizeLocaleTag(tag: String): String = tag.trim().lowercase().replace('_', '-')

    /** Mirrors `@use-voltra/expo-plugin` `localePick`. */
    fun pickLocalizedPayload(
        perLocale: JSONObject,
        preferredTags: List<String>,
    ): JSONObject? {
        val keys = perLocale.keys().asSequence().toList()
        if (keys.isEmpty()) {
            return null
        }

        fun keyNorm(k: String) = normalizeLocaleTag(k)
        val byNorm = keys.associateBy { keyNorm(it) }

        for (pref in preferredTags) {
            val n = keyNorm(pref)
            byNorm[n]?.let { k -> return perLocale.optJSONObject(k) }
            val lang = n.substringBefore('-')
            for (k in keys) {
                val kn = keyNorm(k)
                val keyLang = kn.substringBefore('-')
                if (keyLang == lang) {
                    return perLocale.optJSONObject(k)
                }
            }
        }
        if (perLocale.has("en")) {
            return perLocale.optJSONObject("en")
        }
        if (perLocale.has("__default")) {
            return perLocale.optJSONObject("__default")
        }
        return keys.sorted().firstOrNull()?.let { perLocale.optJSONObject(it) }
    }
}
