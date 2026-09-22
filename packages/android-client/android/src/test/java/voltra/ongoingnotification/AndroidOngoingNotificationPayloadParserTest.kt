package voltra.ongoingnotification

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class AndroidOngoingNotificationPayloadParserTest {
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
