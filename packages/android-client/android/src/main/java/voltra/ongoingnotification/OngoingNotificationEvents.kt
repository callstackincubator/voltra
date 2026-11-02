package voltra.ongoingnotification

import org.json.JSONObject
import voltra.events.VoltraEvent

/**
 * The events an ongoing notification sends through the Android event channel (ADR 0014, ADR 0015).
 * Every one uses the notification id as `source`; the queue adds `type`, `source` and `timestamp`.
 */
object OngoingNotificationEvents {
    const val TYPE_INTERACTION = "interaction"
    const val TYPE_NOTIFICATION_DISMISSED = "notificationDismissed"
    const val TYPE_NOTIFICATION_TAPPED = "notificationTapped"

    const val REPLY_SOURCE_FREE_FORM = "freeForm"
    const val REPLY_SOURCE_CHOICE = "choice"

    /** A direct reply typed or picked in the notification shade. [source] is `freeForm` or `choice`. */
    data class Reply(
        val key: String,
        val text: String,
        val source: String,
    )

    /**
     * A press on an event action. Mirrors the iOS `interaction` event: `identifier` is the action's
     * `actionId` and `payload` its `payload` or `""`. [revision] is the render the pressed button
     * belonged to.
     */
    fun interaction(
        notificationId: String,
        actionId: String,
        payload: String,
        revision: Int,
        reply: Reply? = null,
    ): VoltraEvent =
        VoltraEvent(
            type = TYPE_INTERACTION,
            source = notificationId,
            fields =
                JSONObject()
                    .put("identifier", actionId)
                    .put("payload", payload)
                    .put("notificationId", notificationId)
                    .put("revision", revision)
                    .apply {
                        if (reply != null) {
                            put(
                                "reply",
                                JSONObject()
                                    .put("key", reply.key)
                                    .put("text", reply.text)
                                    .put("source", reply.source),
                            )
                        }
                    },
        )

    /** The user swiped the notification away, or its timeout removed it. */
    fun dismissed(notificationId: String): VoltraEvent = notificationEvent(TYPE_NOTIFICATION_DISMISSED, notificationId)

    /** The user tapped the notification's body and the app's Activity received the launch intent. */
    fun tapped(notificationId: String): VoltraEvent = notificationEvent(TYPE_NOTIFICATION_TAPPED, notificationId)

    private fun notificationEvent(
        type: String,
        notificationId: String,
    ) = VoltraEvent(
        type = type,
        source = notificationId,
        fields = JSONObject().put("notificationId", notificationId),
    )
}
