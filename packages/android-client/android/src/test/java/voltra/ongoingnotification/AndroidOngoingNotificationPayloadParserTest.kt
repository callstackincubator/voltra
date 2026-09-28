package voltra.ongoingnotification

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Remote payloads skip the JS renderer, so the Kotlin parser is the authority on
 * payload validity. These constraints mirror the renderer's `node --test` coverage in
 * `packages/android/test/ongoing-notification-renderer.test.js`.
 */
class AndroidOngoingNotificationPayloadParserTest {
    private fun expectInvalidPayload(
        json: String,
        messagePart: String,
    ) {
        try {
            AndroidOngoingNotificationPayloadParser.parseValidated(json)
            throw AssertionError("Expected VOLTRA_NOTIFICATION_INVALID_PAYLOAD for: $json")
        } catch (error: VoltraNotificationException) {
            assertEquals(VoltraNotificationException.INVALID_PAYLOAD, error.code)
            assertTrue(
                "Expected message to mention \"$messagePart\" but was: ${error.message}",
                error.message!!.contains(messagePart, ignoreCase = true),
            )
        }
    }

    @Test
    fun rejectsMalformedJson() {
        expectInvalidPayload("{not json", "parse")
    }

    @Test
    fun rejectsUnknownKind() {
        expectInvalidPayload("""{"v":1,"kind":"carousel","value":1,"max":2}""", "parse")
    }

    @Test
    fun rejectsMissingKindDiscriminator() {
        expectInvalidPayload("""{"v":1,"value":1,"max":2}""", "parse")
    }

    @Test
    fun rejectsProgressWithMissingRequiredFields() {
        expectInvalidPayload("""{"v":1,"kind":"progress"}""", "parse")
    }

    @Test
    fun rejectsCountdownWithoutWhen() {
        expectInvalidPayload(
            """{"v":1,"kind":"progress","value":1,"max":2,"chronometer":true,"chronometerCountDown":true}""",
            "when",
        )
    }

    @Test
    fun acceptsCountdownWithWhenAndOldBooleanChronometerWithoutIt() {
        val countdown =
            AndroidOngoingNotificationPayloadParser.parseValidated(
                """{"v":1,"kind":"progress","value":1,"max":2,"when":1758535200000,"chronometer":true,"chronometerCountDown":true}""",
            )
        assertEquals(true, countdown.chronometerCountDown)

        val legacy =
            AndroidOngoingNotificationPayloadParser.parseValidated(
                """{"v":1,"kind":"progress","value":1,"max":2,"chronometer":true}""",
            )
        assertEquals(true, legacy.chronometer)
        assertEquals(null, legacy.chronometerCountDown)
    }

    @Test
    fun ignoresUnknownKeysForForwardCompatibility() {
        val payload =
            AndroidOngoingNotificationPayloadParser.parseValidated(
                """{"v":1,"kind":"bigText","text":"hi","fromTheFuture":true}""",
            )
        assertTrue(payload is AndroidOngoingNotificationBigTextPayload)
    }

    @Test
    fun pinsTheDocumentedPromotionExtrasKey() {
        // Builder.setRequestPromotedOngoing is SDK 36.1+, so the extras key is written
        // directly; the platform's value for it must never drift from this string.
        assertEquals("android.requestPromotedOngoing", EXTRA_REQUEST_PROMOTED_ONGOING)
    }
}
