package voltra.events

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import voltra.R

/**
 * Runs JavaScript in the background for a notification action press (ADR 0015). ADR 0014's channel
 * never starts JavaScript itself; this service is how #316's presses reach it with no Activity.
 *
 * Starting it loads the app's bundle if no React instance is alive, which registers the app's
 * module-scope listeners. The `VoltraEvents` task then pulls the queued events and waits until the
 * listeners have finished, so the process stays up (and unfrozen) while they run.
 *
 * Started from a broadcast receiver with `startForegroundService`. A user's press on a notification
 * action is an exemption from the Android 12 background foreground-service start restriction. The
 * service promotes itself with the `shortService` type, which needs no type-specific permission and
 * is stopped by the system after about three minutes at most.
 */
class VoltraHeadlessEventService : HeadlessJsTaskService() {
    companion object {
        private const val TAG = "VoltraHeadlessEvents"

        /** Registered by `@use-voltra/android-client` with `AppRegistry.registerHeadlessTask`. */
        const val TASK_NAME = "VoltraEvents"
        const val CHANNEL_ID = "voltra_background_events"
        const val FOREGROUND_NOTIFICATION_ID = 0x566F6C74
        private const val TASK_TIMEOUT_MS = 60_000L

        /**
         * Starts the service. Must be called from `BroadcastReceiver.onReceive`: the wake lock is
         * taken before the receiver returns, as React Native's headless docs require.
         */
        fun start(context: Context) {
            acquireWakeLockNow(context)
            ContextCompat.startForegroundService(context, Intent(context, VoltraHeadlessEventService::class.java))
        }
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        promoteToForeground()
        return super.onStartCommand(intent, flags, startId)
    }

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
        HeadlessJsTaskConfig(
            TASK_NAME,
            Arguments.createMap(),
            TASK_TIMEOUT_MS,
            // React Native refuses a headless task in a resumed app; VoltraHeadlessEventStarter
            // only starts this service when the app is not in the foreground.
            false,
        )

    override fun onTimeout(startId: Int) {
        Log.w(TAG, "Short foreground service timed out; stopping")
        stopSelf()
    }

    override fun onDestroy() {
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    private fun promoteToForeground() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.voltra_background_events_channel_name),
                    NotificationManager.IMPORTANCE_LOW,
                ),
            )
        }
        val notification =
            NotificationCompat
                .Builder(this, CHANNEL_ID)
                .setSmallIcon(applicationInfo.icon)
                .setContentTitle(getString(R.string.voltra_background_events_notification_title))
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setSilent(true)
                .build()
        val type =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE
            } else {
                0
            }
        ServiceCompat.startForeground(this, FOREGROUND_NOTIFICATION_ID, notification, type)
    }
}

/**
 * Decides whether a notification action press starts [VoltraHeadlessEventService] (ADR 0015).
 *
 * Called by the action receiver after the event is recorded. In the foreground the app's JavaScript
 * pulls the event on the channel's signal, and React Native refuses a headless task in a resumed
 * app, so nothing is started. Otherwise the service is started even if a React instance is alive:
 * a background process can be frozen as soon as the receiver returns, and the foreground service
 * keeps it running until the listeners finish. Dismissals and taps never start it.
 */
object VoltraHeadlessEventStarter {
    private const val TAG = "VoltraHeadlessEvents"

    internal var isAppInForeground: () -> Boolean = ::isProcessInForeground
    internal var startHeadless: (Context) -> Unit = VoltraHeadlessEventService::start

    /** Never throws: if the service cannot start, the event stays queued for the next listener. */
    fun startIfNeeded(context: Context) {
        if (isAppInForeground()) return
        try {
            startHeadless(context)
        } catch (error: Exception) {
            // e.g. ForegroundServiceStartNotAllowedException.
            Log.w(TAG, "Could not start headless delivery; the event stays queued", error)
        }
    }

    internal fun resetForTests() {
        isAppInForeground = ::isProcessInForeground
        startHeadless = VoltraHeadlessEventService::start
    }

    private fun isProcessInForeground(): Boolean {
        val info = ActivityManager.RunningAppProcessInfo()
        ActivityManager.getMyMemoryState(info)
        return info.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    }
}
