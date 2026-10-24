package voltra.ongoingnotification

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import voltra.VoltraNotificationManager

/**
 * Keeps the app process alive while one ongoing notification is backed by ongoing work (ADR 0013).
 * Declared by the config plugin under this exact name, so it must not be moved or renamed.
 *
 * One service holds one foreground notification at a time. It is never restarted by the system
 * (`START_NOT_STICKY`): after process death there is no JavaScript left to drive the notification.
 *
 * Every attach arrives through `startForegroundService`, and on Android 9+ a service started that way
 * crashes the app if it stops before calling `startForeground`. So the attach path always goes
 * foreground first, with a bare placeholder when the notification is gone, and only then stops.
 */
class VoltraOngoingNotificationService : Service() {
    companion object {
        private const val TAG = "VoltraOngoingFgsService"
        const val ACTION_ATTACH = "voltra.action.ONGOING_NOTIFICATION_FOREGROUND_ATTACH"
        const val ACTION_STOP = "voltra.action.ONGOING_NOTIFICATION_FOREGROUND_STOP"
        const val EXTRA_NOTIFICATION_ID = "voltra.extra.NOTIFICATION_ID"
        const val EXTRA_TYPE = "voltra.extra.FOREGROUND_SERVICE_TYPE"
        const val EXTRA_SYSTEM_NOTIFICATION_ID = "voltra.extra.SYSTEM_NOTIFICATION_ID"
        const val EXTRA_CHANNEL_ID = "voltra.extra.CHANNEL_ID"
        const val EXTRA_REMOVE_NOTIFICATION = "voltra.extra.REMOVE_NOTIFICATION"

        fun attachIntent(
            context: Context,
            notificationId: String,
            type: String,
            systemNotificationId: Int,
            channelId: String,
        ): Intent =
            Intent(context, VoltraOngoingNotificationService::class.java)
                .setAction(ACTION_ATTACH)
                .putExtra(EXTRA_NOTIFICATION_ID, notificationId)
                .putExtra(EXTRA_TYPE, type)
                .putExtra(EXTRA_SYSTEM_NOTIFICATION_ID, systemNotificationId)
                .putExtra(EXTRA_CHANNEL_ID, channelId)

        fun stopIntent(
            context: Context,
            notificationId: String,
            removeNotification: Boolean,
        ): Intent =
            Intent(context, VoltraOngoingNotificationService::class.java)
                .setAction(ACTION_STOP)
                .putExtra(EXTRA_NOTIFICATION_ID, notificationId)
                .putExtra(EXTRA_REMOVE_NOTIFICATION, removeNotification)
    }

    private var attachedNotificationId: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        when (intent?.action) {
            ACTION_ATTACH -> attach(intent, startId)
            ACTION_STOP -> stop(intent.getBooleanExtra(EXTRA_REMOVE_NOTIFICATION, false), startId)
            else -> if (attachedNotificationId == null) stopSelfResult(startId)
        }
        return START_NOT_STICKY
    }

    private fun attach(
        intent: Intent,
        startId: Int,
    ) {
        val notificationId = intent.notificationIdExtra()
        val type =
            intent
                .getStringExtra(
                    EXTRA_TYPE,
                )?.let { AndroidOngoingNotificationForegroundServiceTypes.byName(it) }
        val systemNotificationId = intent.getIntExtra(EXTRA_SYSTEM_NOTIFICATION_ID, 0)
        val notification =
            notificationId?.let {
                VoltraOngoingNotificationForegroundServiceRegistry.takePostedNotification(it)
                    ?: VoltraNotificationManager(applicationContext).buildNotificationFromRecord(it)?.notification
            }

        if (notificationId == null || type == null || notification == null || !recordExists(notificationId)) {
            Log.w(TAG, "Attach for unknown notification '$notificationId'; stopping")
            releaseWithoutNotification(type, systemNotificationId, intent.getStringExtra(EXTRA_CHANNEL_ID), startId)
            notificationId?.let {
                VoltraOngoingNotificationForegroundServiceRegistry.reportAttach(
                    it,
                    AndroidOngoingNotificationForegroundServiceResult.failed("attach_timeout"),
                )
            }
            return
        }

        try {
            goForeground(systemNotificationId, notification, type)
        } catch (error: Exception) {
            // The manager checks the type's prerequisites before starting the service, so this is a
            // failure it could not foresee. Nothing can satisfy the start contract any more.
            val reason = foregroundServiceFailureReason(error)
            Log.e(TAG, "startForeground failed for '$notificationId': $reason", error)
            VoltraOngoingNotificationForegroundServiceRegistry.reportAttach(
                notificationId,
                AndroidOngoingNotificationForegroundServiceResult.failed(reason),
            )
            if (attachedNotificationId == null) stopSelfResult(startId)
            return
        }

        // The manager may have given up (attach timeout with `fallbackBehavior: 'error'`) or the app
        // stopped the notification while the service was starting: never hold a notification Voltra
        // no longer tracks, or stop and endAll could not reach it.
        if (!recordExists(notificationId)) {
            Log.w(TAG, "Notification '$notificationId' was removed while attaching; releasing it")
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelfResult(startId)
            return
        }

        attachedNotificationId = notificationId
        VoltraNotificationManager.updateForegroundServiceState(
            applicationContext,
            notificationId,
            FOREGROUND_SERVICE_STATE_ATTACHED,
        )
        VoltraOngoingNotificationForegroundServiceRegistry.reportAttach(
            notificationId,
            AndroidOngoingNotificationForegroundServiceResult.attached(type.name),
        )
    }

    private fun recordExists(notificationId: String): Boolean =
        VoltraNotificationManager.readRecord(applicationContext, notificationId) != null

    private fun goForeground(
        systemNotificationId: Int,
        notification: Notification,
        type: AndroidOngoingNotificationForegroundServiceTypes.Type,
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(systemNotificationId, notification, type.flag)
        } else {
            startForeground(systemNotificationId, notification)
        }
    }

    /**
     * Satisfies the `startForegroundService` contract when there is nothing to attach (the
     * notification was stopped before the service ran), then removes the placeholder and stops.
     */
    private fun releaseWithoutNotification(
        type: AndroidOngoingNotificationForegroundServiceTypes.Type?,
        systemNotificationId: Int,
        channelId: String?,
        startId: Int,
    ) {
        if (attachedNotificationId != null) return
        if (type != null && systemNotificationId != 0) {
            try {
                goForeground(systemNotificationId, placeholderNotification(channelId), type)
                stopForeground(STOP_FOREGROUND_REMOVE)
            } catch (error: Exception) {
                Log.e(TAG, "Could not satisfy the foreground start before stopping", error)
            }
        }
        stopSelfResult(startId)
    }

    @Suppress("DEPRECATION")
    private fun placeholderNotification(channelId: String?): Notification {
        val builder =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && channelId != null) {
                Notification.Builder(this, channelId)
            } else {
                Notification.Builder(this)
            }
        return builder.setSmallIcon(applicationInfo.icon).build()
    }

    // A queued attach for a later start id keeps the service alive: only this command is finished.
    private fun stop(
        removeNotification: Boolean,
        startId: Int,
    ) {
        stopForeground(if (removeNotification) STOP_FOREGROUND_REMOVE else STOP_FOREGROUND_DETACH)
        if (stopSelfResult(startId)) return
        attachedNotificationId?.let { notificationId ->
            VoltraNotificationManager.updateForegroundServiceState(
                applicationContext,
                notificationId,
                FOREGROUND_SERVICE_STATE_DETACHED,
                onlyFrom = FOREGROUND_SERVICE_STATE_ATTACHED,
            )
        }
        attachedNotificationId = null
        // onDestroy will not run for this stop, so release the waiting manager here.
        VoltraOngoingNotificationForegroundServiceRegistry.reportDestroyed()
    }

    // shortService on API 34.
    override fun onTimeout(startId: Int) {
        timeOut()
    }

    // dataSync on API 35 and later.
    override fun onTimeout(
        startId: Int,
        fgsType: Int,
    ) {
        timeOut()
    }

    private fun timeOut() {
        attachedNotificationId?.let { notificationId ->
            Log.w(TAG, "Foreground service for '$notificationId' timed out; the notification stays posted")
            VoltraNotificationManager.updateForegroundServiceState(
                applicationContext,
                notificationId,
                FOREGROUND_SERVICE_STATE_TIMED_OUT,
                onlyFrom = FOREGROUND_SERVICE_STATE_ATTACHED,
            )
        }
        // The system requires the service to stop promptly, whatever else is queued.
        stopForeground(STOP_FOREGROUND_DETACH)
        stopSelf()
    }

    override fun onDestroy() {
        attachedNotificationId?.let { notificationId ->
            VoltraNotificationManager.updateForegroundServiceState(
                applicationContext,
                notificationId,
                FOREGROUND_SERVICE_STATE_DETACHED,
                onlyFrom = FOREGROUND_SERVICE_STATE_ATTACHED,
            )
        }
        attachedNotificationId = null
        VoltraOngoingNotificationForegroundServiceRegistry.reportDestroyed()
        super.onDestroy()
    }
}
