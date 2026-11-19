package voltra

import android.content.Context
import android.content.Intent
import voltra.events.VoltraEventBus
import voltra.ongoingnotification.OngoingNotificationEvents

/**
 * Turns an Activity intent launched by an ongoing notification's content tap into one
 * `notificationTapped` event (ADR 0015). The tap cannot go through a receiver (the Android 12
 * trampoline rule), so the content PendingIntent targets the Activity and carries
 * [VoltraNotificationManager.EXTRA_TAPPED]; the module reads it from the launch intent and from
 * `onNewIntent`.
 */
object VoltraNotificationTapHandler {
    /**
     * Reports the tap carried by [intent], if any, and strips the marker so a re-delivered intent
     * (for example after a configuration change) does not report it again. Returns whether it did.
     */
    fun consume(
        context: Context,
        intent: Intent?,
    ): Boolean {
        if (intent == null || !intent.getBooleanExtra(VoltraNotificationManager.EXTRA_TAPPED, false)) return false
        intent.removeExtra(VoltraNotificationManager.EXTRA_TAPPED)
        val notificationId = intent.getStringExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID) ?: return false
        VoltraEventBus.send(context, OngoingNotificationEvents.tapped(notificationId))
        return true
    }
}
