package voltra

import android.app.RemoteInput
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import voltra.events.VoltraEventBus
import voltra.events.VoltraHeadlessEventStarter
import voltra.ongoingnotification.OngoingNotificationEvents

/**
 * Receives a press on an ongoing notification's event action (`actionId`) and records it in the
 * event channel as an `interaction` event (ADR 0014, ADR 0015).
 *
 * The receiver only records: it never starts an Activity (the Android 12 trampoline rule), never
 * waits for JavaScript, and never uses `goAsync()`. The event is persisted before `send` returns;
 * the receiver then starts JavaScript in the background when the app is not in the foreground.
 */
class VoltraOngoingNotificationActionReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "VoltraNotifAction"
    }

    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val notificationId = intent.getStringExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID) ?: return
        val actionId = intent.getStringExtra(VoltraNotificationManager.EXTRA_ACTION_ID) ?: return

        // 1. A press on a stopped or dismissed notification is dropped: nothing is recorded.
        val record = VoltraNotificationManager.getRecordSnapshot(context, notificationId)
        if (record == null || record.dismissed) {
            Log.d(TAG, "Dropping press on $actionId: notification $notificationId is stopped or dismissed")
            return
        }

        // 2. A reply without text is a plain press.
        val replyKey = intent.getStringExtra(VoltraNotificationManager.EXTRA_REMOTE_INPUT_KEY)
        val reply =
            replyKey?.let { key ->
                RemoteInput.getResultsFromIntent(intent)?.getCharSequence(key)?.toString()?.let { text ->
                    OngoingNotificationEvents.Reply(key = key, text = text, source = readReplySource(intent))
                }
            }

        // 3. Clears the inline reply spinner now, even if JavaScript takes seconds to start.
        if (reply != null) {
            VoltraNotificationManager(context).repostLastPayload(notificationId)
        }

        // 4. Persist, then wake JavaScript if it may not be running.
        VoltraEventBus.send(
            context,
            OngoingNotificationEvents.interaction(
                notificationId = notificationId,
                actionId = actionId,
                payload = intent.getStringExtra(VoltraNotificationManager.EXTRA_ACTION_PAYLOAD) ?: "",
                revision = intent.getIntExtra(VoltraNotificationManager.EXTRA_REVISION, 0),
                reply = reply,
            ),
        )
        VoltraHeadlessEventStarter.startIfNeeded(context)
    }

    // getResultsSource is API 28; earlier platforms cannot tell a picked choice from typed text.
    private fun readReplySource(intent: Intent): String =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
            RemoteInput.getResultsSource(intent) == RemoteInput.SOURCE_CHOICE
        ) {
            OngoingNotificationEvents.REPLY_SOURCE_CHOICE
        } else {
            OngoingNotificationEvents.REPLY_SOURCE_FREE_FORM
        }
}
