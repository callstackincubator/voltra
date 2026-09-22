package voltra.ongoingnotification

/**
 * A rejection the notification APIs translate into a promise rejection with [code],
 * so no Kotlin exception escapes an ongoing-notification TurboModule method.
 */
class VoltraNotificationException(
    val code: String,
    message: String,
    cause: Throwable? = null,
) : Exception(message, cause) {
    companion object {
        const val CHANNEL_REQUIRED = "VOLTRA_NOTIFICATION_CHANNEL_REQUIRED"
        const val CHANNEL_NOT_FOUND = "VOLTRA_NOTIFICATION_CHANNEL_NOT_FOUND"
        const val INVALID_PAYLOAD = "VOLTRA_NOTIFICATION_INVALID_PAYLOAD"
        const val NOT_PROMOTABLE = "VOLTRA_NOTIFICATION_NOT_PROMOTABLE"

        /** Catch-all for failures that are not the caller's input, so a promise is never left unsettled. */
        const val INTERNAL_ERROR = "VOLTRA_NOTIFICATION_INTERNAL_ERROR"
    }
}
