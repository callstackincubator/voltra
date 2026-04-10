package voltra.ongoingnotification

import kotlinx.serialization.json.Json

object AndroidOngoingNotificationPayloadParser {
    private val json =
        Json {
            ignoreUnknownKeys = true
            classDiscriminator = "kind"
        }

    fun parse(payload: String): AndroidOngoingNotificationPayload = json.decodeFromString(payload)
}
