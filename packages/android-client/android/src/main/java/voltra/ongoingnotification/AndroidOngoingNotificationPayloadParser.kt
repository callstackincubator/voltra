package voltra.ongoingnotification

import kotlinx.serialization.json.Json

object AndroidOngoingNotificationPayloadParser {
    private val json =
        Json {
            ignoreUnknownKeys = true
            classDiscriminator = "kind"
        }

    fun parse(payload: String): AndroidOngoingNotificationPayload = json.decodeFromString(payload)

    /**
     * Parses and applies the payload's own constraints, mapping any failure — unknown
     * `kind`, malformed JSON, a violated constraint — to a coded rejection, because
     * remote payloads skip the JS renderer and this side is the authority.
     */
    fun parseValidated(payload: String): AndroidOngoingNotificationPayload =
        try {
            parse(payload).also { it.validate() }
        } catch (error: VoltraNotificationException) {
            throw error
        } catch (error: Exception) {
            throw VoltraNotificationException(
                VoltraNotificationException.INVALID_PAYLOAD,
                "Could not parse ongoing notification payload: ${error.message}",
                error,
            )
        }
}
