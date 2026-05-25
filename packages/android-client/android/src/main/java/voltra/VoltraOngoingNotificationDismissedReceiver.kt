package voltra

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class VoltraOngoingNotificationDismissedReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val notificationId = intent.getStringExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID) ?: return
        VoltraNotificationManager.markDismissed(context, notificationId)
    }
}
