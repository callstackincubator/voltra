package voltra

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import voltra.glance.RemoteViewsGenerator
import voltra.parsing.VoltraPayloadParser
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

class VoltraNotificationManager(
    private val context: Context,
) {
    companion object {
        private const val TAG = "VoltraNotificationMgr"
    }

    private val notificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    private val activeNotifications = ConcurrentHashMap<String, Int>()
    private val idCounter = AtomicInteger(10000)

    suspend fun startLiveUpdate(
        payload: String,
        updateName: String?,
        channelId: String,
    ): String =
        withContext(Dispatchers.Default) {
            Log.d(TAG, "startLiveUpdate called with updateName=$updateName, channelId=$channelId")
            Log.d(TAG, "Payload (first 200 chars): ${payload.take(200)}")

            val voltraPayload = VoltraPayloadParser.parse(payload)
            val notificationId = updateName ?: "live-update-${idCounter.getAndIncrement()}"
            val intId = notificationId.hashCode().and(0x7FFFFFFF) // Ensure positive

            Log.d(TAG, "Parsed payload, notificationId=$notificationId, intId=$intId")

            createNotificationChannel(channelId)

            val collapsedView = RemoteViewsGenerator.generateCollapsed(context, voltraPayload)
            val expandedView = RemoteViewsGenerator.generateExpanded(context, voltraPayload)

            Log.d(TAG, "Generated views: collapsed=${collapsedView != null}, expanded=${expandedView != null}")

            val notification =
                NotificationCompat
                    .Builder(context, channelId)
                    .setSmallIcon(getSmallIcon(voltraPayload.smallIcon))
                    .setOngoing(true)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .apply {
                        collapsedView?.let { setCustomContentView(it) }
                        expandedView?.let { setCustomBigContentView(it) }
                    }.build()

            notificationManager.notify(intId, notification)
            activeNotifications[notificationId] = intId

            Log.d(TAG, "Notification posted. Active notifications: ${activeNotifications.keys}")

            notificationId
        }

    suspend fun updateLiveUpdate(
        notificationId: String,
        payload: String,
    ) = withContext(Dispatchers.Default) {
        Log.d(TAG, "updateLiveUpdate called with notificationId=$notificationId")
        Log.d(TAG, "Active notifications: ${activeNotifications.keys}")

        val intId = activeNotifications[notificationId]
        if (intId == null) {
            Log.e(TAG, "Notification $notificationId not found in activeNotifications!")
            return@withContext
        }

        Log.d(TAG, "Found intId=$intId for notificationId=$notificationId")

        val voltraPayload = VoltraPayloadParser.parse(payload)
        val channelId = voltraPayload.channelId ?: "voltra_live_updates"

        val collapsedView = RemoteViewsGenerator.generateCollapsed(context, voltraPayload)
        val expandedView = RemoteViewsGenerator.generateExpanded(context, voltraPayload)

        Log.d(TAG, "Update generated views: collapsed=${collapsedView != null}, expanded=${expandedView != null}")

        val notification =
            NotificationCompat
                .Builder(context, channelId)
                .setSmallIcon(getSmallIcon(voltraPayload.smallIcon))
                .setOngoing(true)
                .setOnlyAlertOnce(true) // Don't make sound/vibration on updates
                .setWhen(System.currentTimeMillis()) // Force timestamp update
                .setShowWhen(false) // But don't show the time
                .apply {
                    collapsedView?.let { setCustomContentView(it) }
                    expandedView?.let { setCustomBigContentView(it) }
                }.build()

        // Force notification flags to allow updates
        notification.flags = notification.flags or android.app.Notification.FLAG_ONGOING_EVENT

        notificationManager.notify(intId, notification)
        Log.d(TAG, "Notification updated successfully")
    }

    fun stopLiveUpdate(notificationId: String) {
        Log.d(TAG, "stopLiveUpdate called with notificationId=$notificationId")
        activeNotifications.remove(notificationId)?.let { intId ->
            notificationManager.cancel(intId)
            Log.d(TAG, "Notification cancelled")
        }
    }

    fun isLiveUpdateActive(updateName: String): Boolean = activeNotifications.containsKey(updateName)

    fun endAllLiveUpdates() {
        Log.d(TAG, "endAllLiveUpdates called")
        activeNotifications.forEach { (_, intId) ->
            notificationManager.cancel(intId)
        }
        activeNotifications.clear()
    }

    private fun createNotificationChannel(channelId: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel =
                NotificationChannel(
                    channelId,
                    "Voltra Live Updates",
                    NotificationManager.IMPORTANCE_DEFAULT,
                ).apply {
                    description = "Live update notifications from Voltra"
                }
            notificationManager.createNotificationChannel(channel)
            Log.d(TAG, "Notification channel created: $channelId")
        }
    }

    private fun getSmallIcon(iconName: String?): Int {
        if (iconName != null) {
            val resId =
                context.resources.getIdentifier(
                    iconName,
                    "drawable",
                    context.packageName,
                )
            if (resId != 0) return resId
        }
        return context.applicationInfo.icon
    }
}
