package voltra.ongoingnotification

import android.app.Notification
import android.content.Context
import voltra.VoltraNotificationManager

/**
 * For apps that run their own foreground service and want it to carry Voltra's notification:
 * `startForeground(systemNotificationId(...), buildNotification(...))`.
 *
 * Voltra's `stop` cannot remove a notification adopted this way, because the platform ignores
 * `cancel()` for a foreground service notification. Only the app's own
 * `stopForeground(STOP_FOREGROUND_REMOVE)` removes it.
 */
object VoltraOngoingNotifications {
    /** The notification last posted for [notificationId], rebuilt from its record, or null. */
    @JvmStatic
    fun buildNotification(
        context: Context,
        notificationId: String,
    ): Notification? = VoltraNotificationManager(context).buildNotificationFromRecord(notificationId)?.notification

    /** The id the notification is posted under, or null when Voltra has no such notification. */
    @JvmStatic
    fun systemNotificationId(
        context: Context,
        notificationId: String,
    ): Int? = VoltraNotificationManager(context).getOngoingNotificationHandle(notificationId)?.systemNotificationId
}
