package voltra

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import voltra.ongoingnotification.FOREGROUND_SERVICE_ON_DISMISS_KEEP
import voltra.ongoingnotification.VoltraOngoingNotificationForegroundServiceRegistry
import voltra.ongoingnotification.VoltraOngoingNotificationService

class VoltraOngoingNotificationDismissedReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val notificationId = intent.getStringExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID) ?: return
        VoltraNotificationManager.markDismissed(context, notificationId)
        stopForegroundServiceIfNeeded(context, notificationId)
    }

    // The user already removed the notification, so the service only detaches. Nothing is reposted.
    private fun stopForegroundServiceIfNeeded(
        context: Context,
        notificationId: String,
    ) {
        if (VoltraOngoingNotificationForegroundServiceRegistry.attachedNotificationId != notificationId) return
        val record = VoltraNotificationManager.readRecord(context, notificationId) ?: return
        if (record.foregroundServiceOnDismiss == FOREGROUND_SERVICE_ON_DISMISS_KEEP) return
        try {
            context.startService(
                VoltraOngoingNotificationService.stopIntent(context, notificationId, removeNotification = false),
            )
        } catch (error: Exception) {
            Log.w("VoltraDismissedReceiver", "Could not stop the foreground service for '$notificationId'", error)
        }
    }
}
