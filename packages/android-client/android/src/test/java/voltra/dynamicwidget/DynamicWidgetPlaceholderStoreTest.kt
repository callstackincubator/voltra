package voltra.dynamicwidget

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.widget.payload.VoltraWidgetManager

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetPlaceholderStoreTest {
    private fun storeWithAsset(json: String?): DynamicWidgetPlaceholderStore =
        DynamicWidgetPlaceholderStore(
            RuntimeEnvironment.getApplication(),
            assetSource = DynamicWidgetPlaceholderAssetSource { json },
        )

    @Test
    fun returnsAssetEntryForPlainObject() {
        val store =
            storeWithAsset(
                """{"plain-widget":{"kind":"text","value":"hello"}}""",
            )

        val result = store.readPlaceholderJson("plain-widget")

        assertEquals(
            JSONObject("""{"kind":"text","value":"hello"}""").toString(),
            JSONObject(requireNotNull(result)).toString(),
        )
    }

    @Test
    fun returnsNullWhenIdIsMissing() {
        val store = storeWithAsset("""{"other-widget":{"kind":"text"}}""")

        assertNull(store.readPlaceholderJson("absent-widget"))
    }

    @Test
    fun returnsNullWhenAssetIsAbsent() {
        val store = storeWithAsset(null)

        assertNull(store.readPlaceholderJson("any-widget"))
    }

    @Test
    fun returnsNullWhenAssetIsInvalidJson() {
        val store = storeWithAsset("not valid json")

        assertNull(store.readPlaceholderJson("any-widget"))
    }

    @Test
    fun ignoresPayloadWrittenToPayloadSharedPreferences() {
        val application = RuntimeEnvironment.getApplication()
        // A payload written under the same widget id, via the payload-owning manager, must never
        // leak into the Dynamic Widget placeholder (ADR 0000: Dynamic Widgets never read payload
        // state).
        VoltraWidgetManager(application).writeWidgetData(
            "mixed-widget",
            """{"variants":[{"width":1,"height":1,"node":{"type":"unsupported-shape"}}]}""",
            null,
        )
        val store =
            DynamicWidgetPlaceholderStore(
                application,
                assetSource =
                    DynamicWidgetPlaceholderAssetSource {
                        """{"mixed-widget":{"kind":"text","value":"from-asset"}}"""
                    },
            )

        val result = store.readPlaceholderJson("mixed-widget")

        assertEquals(
            JSONObject("""{"kind":"text","value":"from-asset"}""").toString(),
            JSONObject(requireNotNull(result)).toString(),
        )
    }

    @Test
    fun picksExactLocaleTagMatch() {
        val store =
            storeWithAsset(
                """
                {
                  "locale-widget": {
                    "__voltraLocales": {
                      "en": {"value":"english"},
                      "pl-PL": {"value":"polish"},
                      "en-US": {"value":"english-us"}
                    }
                  }
                }
                """.trimIndent(),
            )
        setDeviceLocales(listOf("en-US"))

        val result = store.readPlaceholderJson("locale-widget")

        assertEquals(JSONObject("""{"value":"english-us"}""").toString(), JSONObject(requireNotNull(result)).toString())
    }

    @Test
    fun fallsBackToLanguageOnlyMatch() {
        val store =
            storeWithAsset(
                """
                {
                  "locale-widget": {
                    "__voltraLocales": {
                      "en": {"value":"english"},
                      "pl": {"value":"polish"}
                    }
                  }
                }
                """.trimIndent(),
            )
        setDeviceLocales(listOf("pl-PL"))

        val result = store.readPlaceholderJson("locale-widget")

        assertEquals(JSONObject("""{"value":"polish"}""").toString(), JSONObject(requireNotNull(result)).toString())
    }

    @Test
    fun fallsBackToEnWhenNoDeviceLocaleMatches() {
        val store =
            storeWithAsset(
                """
                {
                  "locale-widget": {
                    "__voltraLocales": {
                      "en": {"value":"english"},
                      "fr": {"value":"french"}
                    }
                  }
                }
                """.trimIndent(),
            )
        setDeviceLocales(listOf("de-DE"))

        val result = store.readPlaceholderJson("locale-widget")

        assertEquals(JSONObject("""{"value":"english"}""").toString(), JSONObject(requireNotNull(result)).toString())
    }

    @Test
    fun fallsBackToDefaultWhenNoEnAndNoDeviceLocaleMatches() {
        val store =
            storeWithAsset(
                """
                {
                  "locale-widget": {
                    "__voltraLocales": {
                      "__default": {"value":"default"},
                      "fr": {"value":"french"}
                    }
                  }
                }
                """.trimIndent(),
            )
        setDeviceLocales(listOf("de-DE"))

        val result = store.readPlaceholderJson("locale-widget")

        assertEquals(JSONObject("""{"value":"default"}""").toString(), JSONObject(requireNotNull(result)).toString())
    }

    @Test
    fun fallsBackToSortedFirstKeyWhenNothingElseMatches() {
        val store =
            storeWithAsset(
                """
                {
                  "locale-widget": {
                    "__voltraLocales": {
                      "fr": {"value":"french"},
                      "de": {"value":"german"}
                    }
                  }
                }
                """.trimIndent(),
            )
        setDeviceLocales(listOf("ja-JP"))

        val result = store.readPlaceholderJson("locale-widget")

        assertEquals(JSONObject("""{"value":"german"}""").toString(), JSONObject(requireNotNull(result)).toString())
    }

    private fun setDeviceLocales(tags: List<String>) {
        val application = RuntimeEnvironment.getApplication()
        val locales = android.os.LocaleList(*tags.map { java.util.Locale.forLanguageTag(it) }.toTypedArray())
        val configuration = android.content.res.Configuration(application.resources.configuration)
        configuration.setLocales(locales)
        application.resources.updateConfiguration(configuration, application.resources.displayMetrics)
    }
}
