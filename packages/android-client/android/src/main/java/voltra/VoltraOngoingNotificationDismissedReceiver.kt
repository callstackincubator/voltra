package voltra

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import voltra.events.VoltraEventBus
import voltra.ongoingnotification.OngoingNotificationEvents

class VoltraOngoingNotificationDismissedReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val notificationId = intent.getStringExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID) ?: return
        if (!VoltraNotificationManager.markDismissed(context, notificationId)) return
        // The record keeps the dismissed state for the getters (ADR 0012); the event reports it (ADR 0015).
        VoltraEventBus.send(context, OngoingNotificationEvents.dismissed(notificationId))
    }
}
