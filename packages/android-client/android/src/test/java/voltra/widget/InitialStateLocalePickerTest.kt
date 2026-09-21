package voltra.widget

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Exhaustive coverage of [InitialStateLocalePicker.pickLocalizedPayload]'s selection order: exact
 * tag, language fallback, `en`, `__default`, sorted-first, and the current behaviour for a
 * non-object locale value. Mirrors `@use-voltra/expo-plugin`'s `localePick`.
 */
@RunWith(RobolectricTestRunner::class)
class InitialStateLocalePickerTest {
    @Test
    fun picksAnExactTagMatch() {
        val perLocale =
            JSONObject(
                """{"en":{"value":"english"},"pl-PL":{"value":"polish"}}""",
            )

        val result = InitialStateLocalePicker.pickLocalizedPayload(perLocale, listOf("pl-PL"))

        assertEquals(JSONObject("""{"value":"polish"}""").toString(), result?.toString())
    }

    @Test
    fun fallsBackToTheLanguageWhenNoExactTagMatches() {
        val perLocale =
            JSONObject(
                """{"en":{"value":"english"},"pl":{"value":"polish"}}""",
            )

        val result = InitialStateLocalePicker.pickLocalizedPayload(perLocale, listOf("pl-PL"))

        assertEquals(JSONObject("""{"value":"polish"}""").toString(), result?.toString())
    }

    @Test
    fun fallsBackToEnWhenNoPreferredTagOrLanguageMatches() {
        val perLocale =
            JSONObject(
                """{"en":{"value":"english"},"de":{"value":"german"}}""",
            )

        val result = InitialStateLocalePicker.pickLocalizedPayload(perLocale, listOf("fr"))

        assertEquals(JSONObject("""{"value":"english"}""").toString(), result?.toString())
    }

    @Test
    fun fallsBackToDefaultWhenNoPreferredTagOrEnMatches() {
        val perLocale =
            JSONObject(
                """{"__default":{"value":"default"},"de":{"value":"german"}}""",
            )

        val result = InitialStateLocalePicker.pickLocalizedPayload(perLocale, listOf("fr"))

        assertEquals(JSONObject("""{"value":"default"}""").toString(), result?.toString())
    }

    @Test
    fun fallsBackToTheSortedFirstKeyWhenNothingElseMatches() {
        val perLocale =
            JSONObject(
                """{"de":{"value":"german"},"cs":{"value":"czech"}}""",
            )

        val result = InitialStateLocalePicker.pickLocalizedPayload(perLocale, listOf("fr"))

        assertEquals(JSONObject("""{"value":"czech"}""").toString(), result?.toString())
    }

    @Test
    fun returnsNullWhenTheMatchedLocaleValueIsNotAnObject() {
        val perLocale = JSONObject("""{"en":"not an object"}""")

        val result = InitialStateLocalePicker.pickLocalizedPayload(perLocale, listOf("en"))

        assertNull(result)
    }
}
