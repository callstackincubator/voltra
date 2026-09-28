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
        // The constant now reads through the platform's own EXTRA_REQUEST_PROMOTED_ONGOING;
        // the system contract is the documented string, and it must never drift.
        assertEquals("android.requestPromotedOngoing", EXTRA_REQUEST_PROMOTED_ONGOING)
    }

    @Test
    fun acceptsAMetricPayloadAndDecodesMetricValues() {
        val payload =
            AndroidOngoingNotificationPayloadParser.parseValidated(
                """{"v":1,"kind":"metric","metrics":[{"label":"Dist","value":{"type":"float",""" +
                    """"value":5.2,"unit":"km","fractionDigits":1}},""" +
                    """{"label":"ETA","value":{"type":"timer","endsAt":1758535200000,"format":"adaptive"}}]}""",
            )

        assertTrue(payload is AndroidOngoingNotificationMetricPayload)
        val metric = payload as AndroidOngoingNotificationMetricPayload
        assertEquals(false, metric.promotionRequiresTitle)
        assertEquals(
            AndroidOngoingNotificationMetricFloatPayload(5.2, "km", null, null, 1),
            metric.metrics[0].value,
        )
        assertEquals(
            AndroidOngoingNotificationMetricTimerPayload(1758535200000L, "adaptive"),
            metric.metrics[1].value,
        )
    }

    @Test
    fun rejectsMetricPayloadViolatingItsOwnConstraints() {
        expectInvalidPayload("""{"v":1,"kind":"metric","metrics":[]}""", "metrics")
        expectInvalidPayload(
            """{"v":1,"kind":"metric","metrics":[{"label":"WayTooLongLabel","value":{"type":"int","value":1}}]}""",
            "label",
        )
        expectInvalidPayload(
            """{"v":1,"kind":"metric","metrics":[{"label":"Dist","value":{"type":"int","value":1}}],""" +
                """"criticalMetric":1}""",
            "criticalMetric",
        )
        expectInvalidPayload(
            """{"v":1,"kind":"metric","metrics":[{"label":"Pace","value":{"type":"text","value":"5:30"}}],""" +
                """"semanticStyle":"urgent"}""",
            "semanticStyle",
        )
    }

    @Test
    fun rejectsMetricValuesBreakingTheirRules() {
        expectInvalidPayload(
            """{"v":1,"kind":"metric","metrics":[{"label":"ETA","value":{"type":"time","value":"25:00"}}]}""",
            "HH:mm",
        )
        expectInvalidPayload(
            """{"v":1,"kind":"metric","metrics":[{"label":"Dist","value":{"type":"float","value":1,""" +
                """"min":5,"max":2}}]}""",
            "min",
        )
        expectInvalidPayload(
            """{"v":1,"kind":"metric","metrics":[{"label":"Dist","value":{"type":"float","value":1,""" +
                """"fractionDigits":-1}}]}""",
            "fractionDigits",
        )
        expectInvalidPayload(
            """{"v":1,"kind":"metric","metrics":[{"label":"Rest","value":{"type":"pausedTimer",""" +
                """"remainingMillis":-5}}]}""",
            "remainingMillis",
        )
        expectInvalidPayload(
            """{"v":1,"kind":"metric","metrics":[{"label":"To go","value":{"type":"timer",""" +
                """"endsAt":1758535200000,"format":"sandclock"}}]}""",
            "format",
        )
        expectInvalidPayload(
            """{"v":1,"kind":"metric","metrics":[{"label":"Now","value":{"type":"epoch","value":1}}]}""",
            "parse",
        )
    }
}
