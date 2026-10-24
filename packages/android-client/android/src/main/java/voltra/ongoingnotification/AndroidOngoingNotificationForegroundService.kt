package voltra.ongoingnotification

import android.Manifest
import android.app.ActivityManager
import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.util.Log
import androidx.annotation.VisibleForTesting
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.ConcurrentHashMap

private const val TAG = "VoltraOngoingFgs"

const val FOREGROUND_SERVICE_STATE_ATTACHED = "attached"
const val FOREGROUND_SERVICE_STATE_DETACHED = "detached"
const val FOREGROUND_SERVICE_STATE_TIMED_OUT = "timed_out"
const val FOREGROUND_SERVICE_STATE_FAILED = "failed"

const val FOREGROUND_SERVICE_ON_DISMISS_STOP = "stop"
const val FOREGROUND_SERVICE_ON_DISMISS_KEEP = "keep"

/** The `foregroundService` option of a start or upsert call. */
data class AndroidOngoingNotificationForegroundServiceOptions(
    val type: String,
    val onDismiss: String? = null,
    val fallbackBehavior: String? = null,
)

/** Either `attached` with the type, or not attached with one of the reasons the JS type lists. */
data class AndroidOngoingNotificationForegroundServiceResult(
    val attached: Boolean,
    val type: String? = null,
    val reason: String? = null,
) {
    companion object {
        fun attached(type: String) = AndroidOngoingNotificationForegroundServiceResult(attached = true, type = type)

        fun failed(reason: String) =
            AndroidOngoingNotificationForegroundServiceResult(attached = false, reason = reason)
    }
}

/**
 * The foreground service types Voltra accepts, keyed by the name used in config and JS.
 * `minSdk` is the level that introduced the `ServiceInfo` constant; below API 29 no type can be
 * passed to `startForeground` at all. `prerequisites` are the runtime permissions Android 14 checks
 * when the service goes foreground: at least one of them must be granted.
 */
internal object AndroidOngoingNotificationForegroundServiceTypes {
    data class Type(
        val name: String,
        val flag: Int,
        val minSdk: Int,
        val prerequisites: List<String> = emptyList(),
    )

    val all =
        listOf(
            Type(
                "location",
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
                29,
                listOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION),
            ),
            Type(
                "connectedDevice",
                ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE,
                29,
                listOf(
                    "android.permission.BLUETOOTH_ADVERTISE",
                    "android.permission.BLUETOOTH_CONNECT",
                    "android.permission.BLUETOOTH_SCAN",
                    "android.permission.CHANGE_NETWORK_STATE",
                    "android.permission.CHANGE_WIFI_STATE",
                    "android.permission.CHANGE_WIFI_MULTICAST_STATE",
                    "android.permission.NFC",
                    "android.permission.TRANSMIT_IR",
                    "android.permission.UWB_RANGING",
                    "android.permission.RANGING",
                ),
            ),
            Type("dataSync", ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC, 29),
            Type("mediaPlayback", ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK, 29),
            Type(
                "health",
                ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH,
                34,
                listOf(
                    "android.permission.ACTIVITY_RECOGNITION",
                    "android.permission.BODY_SENSORS",
                    "android.permission.HIGH_SAMPLING_RATE_SENSORS",
                    "android.permission.health.READ_HEART_RATE",
                    "android.permission.health.READ_SKIN_TEMPERATURE",
                    "android.permission.health.READ_OXYGEN_SATURATION",
                ),
            ),
            Type("remoteMessaging", ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING, 34),
            Type("shortService", ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE, 34),
            Type("specialUse", ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE, 34),
        )

    fun byName(name: String): Type? = all.firstOrNull { it.name == name }

    fun namesFromMask(mask: Int): List<String> =
        all.filter { Build.VERSION.SDK_INT >= it.minSdk && (mask and it.flag) != 0 }.map { it.name }
}

/**
 * Maps a failed `startForegroundService` or `startForeground` to a reason. Matched by class name
 * because the exception classes only exist from API 31 and 34.
 */
internal fun foregroundServiceFailureReason(error: Throwable): String {
    val classNames = generateSequence<Class<*>>(error.javaClass) { it.superclass }.map { it.name }.toList()
    return when {
        "android.app.MissingForegroundServiceTypeException" in classNames ||
            "android.app.InvalidForegroundServiceTypeException" in classNames -> {
            "type_not_declared"
        }

        "android.app.ForegroundServiceStartNotAllowedException" in classNames -> {
            if (error.message?.contains("Time limit already exhausted") == true) {
                "timeout_exhausted"
            } else {
                "background_start_not_allowed"
            }
        }

        error is SecurityException -> {
            "missing_permission"
        }

        else -> {
            Log.w(TAG, "Unexpected foreground service failure", error)
            "background_start_not_allowed"
        }
    }
}

/**
 * In-process state shared by [VoltraOngoingNotificationService] and the manager. The service runs in
 * the app process, so an empty registry in a fresh process means no service is running.
 */
internal object VoltraOngoingNotificationForegroundServiceRegistry {
    @Volatile
    var attachedNotificationId: String? = null
        private set

    private val pendingAttach =
        ConcurrentHashMap<String, CompletableDeferred<AndroidOngoingNotificationForegroundServiceResult>>()

    // The notification the manager just posted, so the service can go foreground with it right away
    // instead of decoding its images again on the main thread.
    private val postedNotifications = ConcurrentHashMap<String, Notification>()

    @Volatile
    private var pendingDestroy: CompletableDeferred<Unit>? = null

    fun expectAttach(notificationId: String): CompletableDeferred<AndroidOngoingNotificationForegroundServiceResult> =
        CompletableDeferred<AndroidOngoingNotificationForegroundServiceResult>().also {
            pendingAttach[notificationId] = it
        }

    fun cancelAttach(notificationId: String) {
        pendingAttach.remove(notificationId)
    }

    fun reportAttach(
        notificationId: String,
        result: AndroidOngoingNotificationForegroundServiceResult,
    ) {
        if (result.attached) {
            attachedNotificationId = notificationId
        }
        pendingAttach.remove(notificationId)?.complete(result)
    }

    fun offerPostedNotification(
        notificationId: String,
        notification: Notification,
    ) {
        postedNotifications[notificationId] = notification
    }

    fun takePostedNotification(notificationId: String): Notification? = postedNotifications.remove(notificationId)

    fun expectDestroy(): CompletableDeferred<Unit> = CompletableDeferred<Unit>().also { pendingDestroy = it }

    fun reportDestroyed() {
        attachedNotificationId = null
        pendingDestroy?.complete(Unit)
        pendingDestroy = null
    }

    @VisibleForTesting
    fun resetForTesting() {
        attachedNotificationId = null
        pendingAttach.clear()
        postedNotifications.clear()
        pendingDestroy = null
    }
}

/** The manager's view of the service, injectable so tests do not need a running service. */
internal interface AndroidOngoingNotificationForegroundServiceController {
    /** The type names declared on the service, or null when the manifest declares no service. */
    fun declaredTypes(): Set<String>?

    /**
     * Why `startForeground` would refuse [type] right now, or null. Checked before the service starts,
     * because a service started with `startForegroundService` that stops without going foreground
     * crashes the app on Android 9 and later.
     */
    fun missingPrerequisite(type: String): String?

    fun attachedNotificationId(): String?

    suspend fun attach(
        notificationId: String,
        type: String,
        systemNotificationId: Int,
        channelId: String,
    ): AndroidOngoingNotificationForegroundServiceResult

    suspend fun stop(
        notificationId: String,
        removeNotification: Boolean,
    )
}

internal class SystemForegroundServiceController(
    private val context: Context,
) : AndroidOngoingNotificationForegroundServiceController {
    private companion object {
        const val ATTACH_TIMEOUT_MS = 5_000L
        const val STOP_TIMEOUT_MS = 2_000L
    }

    override fun declaredTypes(): Set<String>? {
        val serviceInfo = foregroundServiceInfo(context) ?: return null
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return emptySet()
        return AndroidOngoingNotificationForegroundServiceTypes.namesFromMask(serviceInfo.foregroundServiceType).toSet()
    }

    override fun missingPrerequisite(type: String): String? {
        // Type prerequisites and the background location rule are enforced from Android 14.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return null
        val serviceType = AndroidOngoingNotificationForegroundServiceTypes.byName(type) ?: return null
        if (serviceType.prerequisites.isNotEmpty() && serviceType.prerequisites.none(::isGranted)) {
            return "missing_permission"
        }
        if (type == "location" && !isAppVisible() && !isGranted(Manifest.permission.ACCESS_BACKGROUND_LOCATION)) {
            return "background_start_not_allowed"
        }
        return null
    }

    private fun isGranted(permission: String): Boolean =
        context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

    private fun isAppVisible(): Boolean {
        val processInfo = ActivityManager.RunningAppProcessInfo()
        ActivityManager.getMyMemoryState(processInfo)
        return processInfo.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE
    }

    override fun attachedNotificationId(): String? =
        VoltraOngoingNotificationForegroundServiceRegistry.attachedNotificationId

    override suspend fun attach(
        notificationId: String,
        type: String,
        systemNotificationId: Int,
        channelId: String,
    ): AndroidOngoingNotificationForegroundServiceResult {
        val outcome = VoltraOngoingNotificationForegroundServiceRegistry.expectAttach(notificationId)
        val intent =
            VoltraOngoingNotificationService.attachIntent(
                context,
                notificationId,
                type,
                systemNotificationId,
                channelId,
            )
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (error: Exception) {
            VoltraOngoingNotificationForegroundServiceRegistry.cancelAttach(notificationId)
            return AndroidOngoingNotificationForegroundServiceResult.failed(foregroundServiceFailureReason(error))
        }

        return withTimeoutOrNull(ATTACH_TIMEOUT_MS) { outcome.await() }
            ?: run {
                VoltraOngoingNotificationForegroundServiceRegistry.cancelAttach(notificationId)
                Log.w(TAG, "Foreground service did not report for '$notificationId' within ${ATTACH_TIMEOUT_MS}ms")
                // The attach may still land later; this stop is queued behind it and releases it, so
                // the result the caller got stays true.
                sendStop(notificationId, removeNotification = false)
                AndroidOngoingNotificationForegroundServiceResult.failed("attach_timeout")
            }
    }

    override suspend fun stop(
        notificationId: String,
        removeNotification: Boolean,
    ) {
        val destroyed = VoltraOngoingNotificationForegroundServiceRegistry.expectDestroy()
        if (!sendStop(notificationId, removeNotification)) return
        withTimeoutOrNull(STOP_TIMEOUT_MS) { destroyed.await() }
            ?: Log.w(TAG, "Foreground service for '$notificationId' did not stop within ${STOP_TIMEOUT_MS}ms")
    }

    private fun sendStop(
        notificationId: String,
        removeNotification: Boolean,
    ): Boolean =
        try {
            context.startService(
                VoltraOngoingNotificationService.stopIntent(context, notificationId, removeNotification),
            )
            true
        } catch (error: Exception) {
            Log.w(TAG, "Could not stop the foreground service for '$notificationId'", error)
            false
        }
}

@Suppress("DEPRECATION")
internal fun foregroundServiceInfo(context: Context): ServiceInfo? =
    try {
        context.packageManager.getServiceInfo(ComponentName(context, VoltraOngoingNotificationService::class.java), 0)
    } catch (_: PackageManager.NameNotFoundException) {
        null
    }

internal fun Intent.notificationIdExtra(): String? =
    getStringExtra(VoltraOngoingNotificationService.EXTRA_NOTIFICATION_ID)
