package voltra.ongoingnotification

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
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

    @Test
    fun `decodes a bigPicture payload`() {
        val payload =
            AndroidOngoingNotificationPayloadParser.parse(
                """
                {
                  "v": 1,
                  "kind": "bigPicture",
                  "title": "Parcel delivered",
                  "text": "Left at the front door",
                  "picture": { "assetName": "delivery_photo_123" },
                  "largeIcon": { "assetName": "courier_avatar" },
                  "hideLargeIconWhenExpanded": true,
                  "showPictureWhenCollapsed": false,
                  "pictureContentDescription": "Photo of the parcel at the front door",
                  "summaryText": "Order 123",
                  "when": 1760000000000,
                  "actions": [{ "title": "Confirm", "deepLinkUrl": "myapp://orders/123/confirm" }]
                }
                """.trimIndent(),
            )

        payload as AndroidOngoingNotificationBigPicturePayload

        assertEquals(1, payload.v)
        assertEquals("Parcel delivered", payload.title)
        assertEquals("Left at the front door", payload.text)
        assertEquals("delivery_photo_123", payload.picture.assetName)
        assertEquals("courier_avatar", payload.largeIcon?.assetName)
        assertEquals(true, payload.hideLargeIconWhenExpanded)
        assertEquals(false, payload.showPictureWhenCollapsed)
        assertEquals("Photo of the parcel at the front door", payload.pictureContentDescription)
        assertEquals("Order 123", payload.summaryText)
        assertEquals(1760000000000L, payload.whenEpochMillis)
        assertEquals(listOf("Confirm"), payload.actions?.map { action -> action.title })
    }

    @Test
    fun `decodes an inbox payload`() {
        val payload =
            AndroidOngoingNotificationPayloadParser.parse(
                """
                {
                  "v": 1,
                  "kind": "inbox",
                  "title": "3 stops remaining",
                  "text": "Next: 12 Oak Street",
                  "lines": ["12 Oak Street", "4 Elm Road", "Depot"],
                  "summaryText": "Route 7",
                  "chronometer": true,
                  "when": 1760000000000
                }
                """.trimIndent(),
            )

        payload as AndroidOngoingNotificationInboxPayload

        assertEquals(1, payload.v)
        assertEquals("3 stops remaining", payload.title)
        assertEquals("Next: 12 Oak Street", payload.text)
        assertEquals(listOf("12 Oak Street", "4 Elm Road", "Depot"), payload.lines)
        assertEquals("Route 7", payload.summaryText)
        assertEquals(true, payload.chronometer)
        assertEquals(1760000000000L, payload.whenEpochMillis)
        assertNull(payload.actions)
    }

    @Test
    fun `ignores keys this build does not know`() {
        val payload =
            AndroidOngoingNotificationPayloadParser.parse(
                """
                {
                  "v": 1,
                  "kind": "bigPicture",
                  "picture": { "base64": "aW1hZ2U=" },
                  "futureField": { "nested": true }
                }
                """.trimIndent(),
            )

        payload as AndroidOngoingNotificationBigPicturePayload

        assertEquals("aW1hZ2U=", payload.picture.base64)
    }

    @Test
    fun `fails on a kind this build does not know, which is what an older client does with a newer push`() {
        try {
            AndroidOngoingNotificationPayloadParser.parse("""{"v":1,"kind":"metricStyle","title":"Later"}""")
            fail("Expected an unknown payload kind to be rejected")
        } catch (error: Exception) {
            assertTrue(
                "Expected the failure to name the unknown kind, got: $error",
                error.message?.contains("metricStyle") == true,
            )
        }
    }
}
