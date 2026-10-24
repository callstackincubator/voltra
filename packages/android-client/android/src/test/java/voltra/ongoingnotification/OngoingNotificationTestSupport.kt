package voltra.ongoingnotification

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import voltra.VoltraNotificationManager

internal const val TEST_CHANNEL_ID = "voltra_fgs_test"

internal fun testPayload(text: String = "2 stops away"): String =
    """{"v":1,"kind":"progress","title":"Driver is approaching","text":"$text","value":1,"max":2}"""

internal fun Application.prepareForOngoingNotifications(): NotificationManager {
    // The test application has no launcher icon, and a notification without a small icon is rejected.
    applicationInfo.icon = android.R.drawable.sym_def_app_icon
    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        notificationManager.createNotificationChannel(
            NotificationChannel(TEST_CHANNEL_ID, "Voltra FGS test", NotificationManager.IMPORTANCE_DEFAULT),
        )
    }
    getSharedPreferences("voltra_ongoing_notifications", Context.MODE_PRIVATE).edit().clear().commit()
    VoltraOngoingNotificationForegroundServiceRegistry.resetForTesting()
    return notificationManager
}

/**
 * Stands in for the running service. A successful attach writes the same state the real service
 * writes, so the manager's status reads match production.
 */
internal class FakeForegroundServiceController(
    private val context: Context,
    var declared: Set<String>? = setOf("dataSync", "shortService", "location"),
    var attachResult: (String) -> AndroidOngoingNotificationForegroundServiceResult = {
        AndroidOngoingNotificationForegroundServiceResult.attached(it)
    },
) : AndroidOngoingNotificationForegroundServiceController {
    var attachedId: String? = null
    var prerequisiteFailure: String? = null
    val attachCalls = mutableListOf<Pair<String, String>>()
    val stopCalls = mutableListOf<Pair<String, Boolean>>()

    override fun declaredTypes(): Set<String>? = declared

    override fun missingPrerequisite(type: String): String? = prerequisiteFailure

    override fun attachedNotificationId(): String? = attachedId

    override suspend fun attach(
        notificationId: String,
        type: String,
        systemNotificationId: Int,
        channelId: String,
    ): AndroidOngoingNotificationForegroundServiceResult {
        attachCalls += notificationId to type
        val result = attachResult(type)
        if (result.attached) {
            attachedId = notificationId
            VoltraNotificationManager.updateForegroundServiceState(
                context,
                notificationId,
                FOREGROUND_SERVICE_STATE_ATTACHED,
            )
        }
        return result
    }

    override suspend fun stop(
        notificationId: String,
        removeNotification: Boolean,
    ) {
        stopCalls += notificationId to removeNotification
        if (attachedId == notificationId) {
            attachedId = null
            VoltraNotificationManager.updateForegroundServiceState(
                context,
                notificationId,
                FOREGROUND_SERVICE_STATE_DETACHED,
                onlyFrom = FOREGROUND_SERVICE_STATE_ATTACHED,
            )
        }
    }
}
