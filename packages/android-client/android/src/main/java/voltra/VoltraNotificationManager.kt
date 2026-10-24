package voltra

import android.app.Notification
import android.app.Notification.BigTextStyle
import android.app.Notification.Builder
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.annotation.RequiresApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import voltra.ongoingnotification.AndroidOngoingNotificationActionPayload
import voltra.ongoingnotification.AndroidOngoingNotificationBigPicturePayload
import voltra.ongoingnotification.AndroidOngoingNotificationBigTextPayload
import voltra.ongoingnotification.AndroidOngoingNotificationForegroundServiceController
import voltra.ongoingnotification.AndroidOngoingNotificationForegroundServiceOptions
import voltra.ongoingnotification.AndroidOngoingNotificationForegroundServiceResult
import voltra.ongoingnotification.AndroidOngoingNotificationForegroundServiceTypes
import voltra.ongoingnotification.AndroidOngoingNotificationImageSource
import voltra.ongoingnotification.AndroidOngoingNotificationInboxPayload
import voltra.ongoingnotification.AndroidOngoingNotificationMetricPayload
import voltra.ongoingnotification.AndroidOngoingNotificationPayload
import voltra.ongoingnotification.AndroidOngoingNotificationPayloadParser
import voltra.ongoingnotification.AndroidOngoingNotificationPresentation
import voltra.ongoingnotification.AndroidOngoingNotificationPresentationUpdate
import voltra.ongoingnotification.AndroidOngoingNotificationProgressPayload
import voltra.ongoingnotification.AndroidOngoingNotificationProgressPointPayload
import voltra.ongoingnotification.AndroidOngoingNotificationProgressSegmentPayload
import voltra.ongoingnotification.AndroidOngoingNotificationPromotionEvaluator
import voltra.ongoingnotification.AndroidOngoingNotificationPromotionInfo
import voltra.ongoingnotification.AndroidOngoingNotificationPublicVersionPayload
import voltra.ongoingnotification.AndroidOngoingNotificationRecord
import voltra.ongoingnotification.EXTRA_REQUEST_PROMOTED_ONGOING
import voltra.ongoingnotification.FOREGROUND_SERVICE_ON_DISMISS_STOP
import voltra.ongoingnotification.FOREGROUND_SERVICE_STATE_ATTACHED
import voltra.ongoingnotification.FOREGROUND_SERVICE_STATE_DETACHED
import voltra.ongoingnotification.FOREGROUND_SERVICE_STATE_FAILED
import voltra.ongoingnotification.PROMOTION_MIN_SDK
import voltra.ongoingnotification.PromotedLargeIconInset
import voltra.ongoingnotification.SystemForegroundServiceController
import voltra.ongoingnotification.VoltraNotificationException
import voltra.ongoingnotification.VoltraNotificationImageResolver
import voltra.ongoingnotification.VoltraNotificationImageResolver.Companion.MAX_ICON_LONG_EDGE_PX
import voltra.ongoingnotification.VoltraNotificationImageResolver.Companion.MAX_PICTURE_LONG_EDGE_PX
import voltra.ongoingnotification.VoltraOngoingNotificationForegroundServiceRegistry
import voltra.ongoingnotification.androidOngoingNotificationCategory
import voltra.ongoingnotification.androidOngoingNotificationColor
import voltra.ongoingnotification.applyAndroidOngoingNotificationPresentation
import voltra.ongoingnotification.buildMetricStyle
import voltra.ongoingnotification.canUseMetricStyle
import voltra.ongoingnotification.hasPromotedNotificationsPermission
import voltra.ongoingnotification.renderMetricFallbackText
import java.util.concurrent.CopyOnWriteArraySet

private enum class AndroidOngoingNotificationFallbackBehavior {
    STANDARD,
    ERROR,
}

data class AndroidOngoingNotificationOptions(
    val notificationId: String? = null,
    val channelId: String? = null,
    val smallIcon: String? = null,
    val deepLinkUrl: String? = null,
    val requestPromotedOngoing: Boolean? = null,
    val fallbackBehavior: String? = null,
    val presentation: AndroidOngoingNotificationPresentationUpdate = AndroidOngoingNotificationPresentationUpdate(),
    /** Per post, never stored: re-alert for this update instead of posting it silently. */
    val alert: Boolean? = null,
    /** Monotonic per notification; a call whose revision is not above the last applied one is dropped. */
    val revision: Long? = null,
    /** Start and upsert only: back the notification with Voltra's foreground service. */
    val foregroundService: AndroidOngoingNotificationForegroundServiceOptions? = null,
)

data class AndroidOngoingNotificationCapabilities(
    val apiLevel: Int,
    val notificationsEnabled: Boolean,
    val supportsPromotedNotifications: Boolean,
    val canPostPromotedNotifications: Boolean,
    val canRequestPromotedOngoing: Boolean,
    val isUserDismissible: Boolean,
    val supportsForegroundService: Boolean,
    val foregroundServiceTypes: List<String>,
)

data class AndroidOngoingNotificationForegroundServiceStatus(
    val type: String,
    val state: String,
)

data class AndroidOngoingNotificationStatus(
    val isActive: Boolean,
    val isDismissed: Boolean,
    val isPromoted: Boolean? = null,
    val hasPromotableCharacteristics: Boolean? = null,
    val foregroundService: AndroidOngoingNotificationForegroundServiceStatus? = null,
)

data class AndroidOngoingNotificationHandle(
    val notificationId: String,
    val systemNotificationId: Int,
)

/** A notification rebuilt from its record, for the foreground service and the public builder. */
data class AndroidOngoingNotificationBuilt(
    val systemNotificationId: Int,
    val notification: Notification,
)

data class AndroidOngoingNotificationStartResult(
    val ok: Boolean,
    val notificationId: String,
    val action: String? = null,
    val reason: String? = null,
    val promotion: AndroidOngoingNotificationPromotionInfo? = null,
    val styleFallback: String? = null,
    val foregroundService: AndroidOngoingNotificationForegroundServiceResult? = null,
)

data class AndroidOngoingNotificationUpdateResult(
    val ok: Boolean,
    val notificationId: String,
    val action: String? = null,
    val reason: String? = null,
    val promotion: AndroidOngoingNotificationPromotionInfo? = null,
    val styleFallback: String? = null,
)

data class AndroidOngoingNotificationUpsertResult(
    val ok: Boolean,
    val notificationId: String,
    val action: String? = null,
    val reason: String? = null,
    val promotion: AndroidOngoingNotificationPromotionInfo? = null,
    val styleFallback: String? = null,
    val foregroundService: AndroidOngoingNotificationForegroundServiceResult? = null,
)

data class AndroidOngoingNotificationStopResult(
    val ok: Boolean,
    val notificationId: String,
    val action: String? = null,
    val reason: String? = null,
)

/** Told when a recorded ongoing notification stops being live; see [VoltraNotificationManager.addEndedListener]. */
fun interface OngoingNotificationEndedListener {
    fun onEnded(
        notificationId: String,
        reason: String,
    )
}

class VoltraNotificationManager internal constructor(
    context: Context,
    foregroundServiceController: AndroidOngoingNotificationForegroundServiceController?,
) {
    constructor(context: Context) : this(context, null)

    companion object {
        private const val TAG = "VoltraNotificationMgr"
        private const val PREFS_NAME = "voltra_ongoing_notifications"
        private const val KEY_RECORDS = "records"
        private const val KEY_NEXT_NOTIFICATION_ID = "next_notification_id"

        // Last revisions of stopped notifications, so a late older push cannot bring one back.
        private const val KEY_REVISION_TOMBSTONES = "revision_tombstones"
        private const val KEY_PAYLOAD_PREFIX = "payload."
        private const val MAX_REVISION_TOMBSTONES = 100
        private const val DEFAULT_NOTIFICATION_ID = 10000
        private const val PROMOTION_CHECK_NOTIFICATION_ID = "promotion-check"
        private const val REASON_STALE_REVISION = "stale_revision"

        // Shared by every manager instance and by the receiver and service helpers below, which
        // write records without an instance.
        private val recordsLock = Any()

        // Never allocated to a real notification (the allocator starts at 10000), so the
        // throwaway notification built by the promotion pre-flight cannot share its
        // PendingIntent request codes with a real one.
        private const val PROMOTION_CHECK_SYSTEM_NOTIFICATION_ID = -1

        // The expanded InboxStyle template has six line slots. The platform stores every line you
        // hand it, so the cap that keeps the seventh from being silently invisible is ours.
        // Mirrors MAX_INBOX_LINES in packages/android/src/ongoing-notification/renderer.ts.
        private const val MAX_INBOX_LINES = 6
        const val EXTRA_NOTIFICATION_ID = "voltra.extra.NOTIFICATION_ID"

        /** The user swiped the notification away, or the system removed it when its timeout expired. */
        const val ENDED_REASON_DISMISSED = "dismissed"

        /**
         * The app stopped the notification, alone or through `endAll`. `endAll` reports every record it
         * removes, including ones already reported as dismissed; listeners must treat both as idempotent.
         */
        const val ENDED_REASON_STOPPED = "stopped"

        // Process-wide because the dismissal arrives in a BroadcastReceiver that has no reference
        // to the TurboModule; the module registers while it is alive (ADR 0012).
        private val endedListeners = CopyOnWriteArraySet<OngoingNotificationEndedListener>()

        fun addEndedListener(listener: OngoingNotificationEndedListener) {
            endedListeners.add(listener)
        }

        fun removeEndedListener(listener: OngoingNotificationEndedListener) {
            endedListeners.remove(listener)
        }

        private fun notifyEnded(
            notificationId: String,
            reason: String,
        ) {
            endedListeners.forEach { listener ->
                try {
                    listener.onEnded(notificationId, reason)
                } catch (error: Exception) {
                    Log.e(TAG, "Ongoing notification ended listener failed", error)
                }
            }
        }

        private val json =
            Json {
                ignoreUnknownKeys = true
                encodeDefaults = true
            }

        fun markDismissed(
            context: Context,
            notificationId: String,
        ) {
            val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            synchronized(recordsLock) {
                val records = readRecords(prefs).toMutableMap()
                val record = records[notificationId] ?: return

                records[notificationId] =
                    record.copy(
                        active = false,
                        dismissed = true,
                    )
                writeRecords(prefs, records)
            }
            Log.d(TAG, "Marked ongoing notification as dismissed: $notificationId")
            notifyEnded(notificationId, ENDED_REASON_DISMISSED)
        }

        internal fun readRecord(
            context: Context,
            notificationId: String,
        ): AndroidOngoingNotificationRecord? {
            val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return synchronized(recordsLock) { readRecords(prefs)[notificationId] }
        }

        /**
         * Records what the foreground service did. With [onlyFrom], the write happens only when the
         * stored state still equals it, so a late `onDestroy` cannot overwrite `failed` or `timed_out`.
         */
        internal fun updateForegroundServiceState(
            context: Context,
            notificationId: String,
            state: String,
            onlyFrom: String? = null,
        ) {
            val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            synchronized(recordsLock) {
                val records = readRecords(prefs).toMutableMap()
                val record = records[notificationId] ?: return
                if (record.foregroundServiceType == null) return
                if (onlyFrom != null && record.foregroundServiceState != onlyFrom) return
                records[notificationId] = record.copy(foregroundServiceState = state)
                writeRecords(prefs, records)
            }
        }

        private fun readRecords(
            prefs: android.content.SharedPreferences,
        ): Map<String, AndroidOngoingNotificationRecord> {
            val raw = prefs.getString(KEY_RECORDS, null) ?: return emptyMap()
            return try {
                json.decodeFromString<Map<String, AndroidOngoingNotificationRecord>>(raw)
            } catch (error: Exception) {
                Log.e(TAG, "Failed to decode ongoing notification records", error)
                emptyMap()
            }
        }

        private fun writeRecords(
            prefs: android.content.SharedPreferences,
            records: Map<String, AndroidOngoingNotificationRecord>,
        ) {
            prefs.edit().putString(KEY_RECORDS, json.encodeToString(records)).commit()
        }
    }

    private val appContext = context.applicationContext
    private val notificationManager =
        appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    private val promotionEvaluator = AndroidOngoingNotificationPromotionEvaluator(appContext, notificationManager)
    private val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val lock = recordsLock
    private val imageResolver by lazy { VoltraNotificationImageResolver(appContext) }
    private val foregroundService = foregroundServiceController ?: SystemForegroundServiceController(appContext)

    init {
        reconcileForegroundServiceStates()
    }

    suspend fun startOngoingNotification(
        payload: String,
        options: AndroidOngoingNotificationOptions,
    ): AndroidOngoingNotificationStartResult =
        withContext(Dispatchers.Default) {
            val parsedPayload = AndroidOngoingNotificationPayloadParser.parseValidated(payload)
            val notificationId = options.notificationId ?: createGeneratedNotificationId()
            val existingRecord = getRecord(notificationId)
            if (isStaleRevision(notificationId, existingRecord, options.revision)) {
                return@withContext AndroidOngoingNotificationStartResult(
                    ok = false,
                    notificationId = notificationId,
                    reason = REASON_STALE_REVISION,
                )
            }
            // A dismissed record only remembers that the user (or a timeout) ended it, so that updates
            // and upserts cannot bring it back. An explicit start begins a new lifecycle and replaces
            // it, without carrying over any of its options (ADR 0012). It keeps the system slot, so
            // if the old notification is somehow still showing, the new one replaces it in place
            // instead of leaving an orphan that stop and endAll could no longer reach.
            if (existingRecord != null && !existingRecord.dismissed) {
                return@withContext AndroidOngoingNotificationStartResult(
                    ok = false,
                    notificationId = notificationId,
                    reason = "already_exists",
                )
            }

            val foregroundServiceOptions = options.foregroundService
            val foregroundServiceBlocker =
                foregroundServiceOptions?.let { checkForegroundServiceAvailability(it.type, notificationId) }
            rejectBeforePostingIfRequired(notificationId, foregroundServiceOptions, foregroundServiceBlocker)

            // A dismissal with `onDismiss: 'keep'` leaves the service running for the old lifecycle.
            if (foregroundService.attachedNotificationId() == notificationId) {
                foregroundService.stop(notificationId, removeNotification = false)
            }

            val record =
                createMergedRecord(
                    notificationId = notificationId,
                    currentRecord = null,
                    options = options,
                    allowMissingChannel = false,
                ).let { fresh ->
                    fresh
                        .copy(
                            systemNotificationId = existingRecord?.systemNotificationId ?: fresh.systemNotificationId,
                            active = true,
                            dismissed = false,
                            lastRevision =
                                maxRevision(
                                    existingRecord?.lastRevision ?: readTombstone(notificationId),
                                    options.revision,
                                ),
                        ).withForegroundService(foregroundServiceOptions)
                }

            val posted = postNotification(record, parsedPayload, onlyAlertOnce = false)
            saveRecord(record)
            writePayload(notificationId, payload)
            removeTombstone(notificationId)

            val foregroundServiceResult =
                foregroundServiceOptions?.let {
                    attachForegroundService(record, posted.notification, it, foregroundServiceBlocker)
                }

            AndroidOngoingNotificationStartResult(
                ok = true,
                notificationId = notificationId,
                action = "started",
                promotion = posted.promotion,
                styleFallback = resolveStyleFallback(parsedPayload),
                foregroundService = foregroundServiceResult,
            )
        }

    suspend fun updateOngoingNotification(
        notificationId: String,
        payload: String,
        options: AndroidOngoingNotificationOptions?,
    ): AndroidOngoingNotificationUpdateResult =
        withContext(Dispatchers.Default) {
            applyUpdate(notificationId, payload, options, attachingForegroundService = null).result
        }

    private class AppliedUpdate(
        val result: AndroidOngoingNotificationUpdateResult,
        val record: AndroidOngoingNotificationRecord? = null,
        val notification: Notification? = null,
    )

    /**
     * The update itself. With [attachingForegroundService], the record takes that service's fields
     * before posting, so the posted notification is the one the service goes foreground with.
     */
    private fun applyUpdate(
        notificationId: String,
        payload: String,
        options: AndroidOngoingNotificationOptions?,
        attachingForegroundService: AndroidOngoingNotificationForegroundServiceOptions?,
    ): AppliedUpdate {
        val parsedPayload = AndroidOngoingNotificationPayloadParser.parseValidated(payload)
        val currentRecord = getRecord(notificationId)
        if (isStaleRevision(notificationId, currentRecord, options?.revision)) {
            return AppliedUpdate(
                AndroidOngoingNotificationUpdateResult(
                    ok = false,
                    notificationId = notificationId,
                    reason = REASON_STALE_REVISION,
                ),
            )
        }
        if (currentRecord == null) {
            return AppliedUpdate(
                AndroidOngoingNotificationUpdateResult(
                    ok = false,
                    notificationId = notificationId,
                    reason = "not_found",
                ),
            )
        }
        if (currentRecord.dismissed) {
            Log.d(TAG, "Rejected dismissed ongoing notification $notificationId")
            return AppliedUpdate(
                AndroidOngoingNotificationUpdateResult(
                    ok = false,
                    notificationId = notificationId,
                    reason = "dismissed",
                ),
            )
        }

        val record =
            createMergedRecord(
                notificationId = notificationId,
                currentRecord = currentRecord,
                options = options ?: AndroidOngoingNotificationOptions(),
                allowMissingChannel = true,
            ).copy(
                active = true,
                dismissed = false,
                lastRevision = maxRevision(currentRecord.lastRevision, options?.revision),
            ).let { merged ->
                attachingForegroundService?.let { merged.withForegroundService(it) } ?: merged
            }

        // Updates are silent by default; `alert` re-alerts for this one post only. The same
        // system id keeps an attached foreground service bound to the new content.
        val posted = postNotification(record, parsedPayload, onlyAlertOnce = options?.alert != true)
        saveRecord(record)
        writePayload(notificationId, payload)
        return AppliedUpdate(
            AndroidOngoingNotificationUpdateResult(
                ok = true,
                notificationId = notificationId,
                action = "updated",
                promotion = posted.promotion,
                styleFallback = resolveStyleFallback(parsedPayload),
            ),
            record,
            posted.notification,
        )
    }

    suspend fun upsertOngoingNotification(
        payload: String,
        options: AndroidOngoingNotificationOptions,
    ): AndroidOngoingNotificationUpsertResult =
        withContext(Dispatchers.Default) {
            val notificationId = options.notificationId ?: createGeneratedNotificationId()
            val currentRecord = getRecord(notificationId)

            if (currentRecord == null) {
                val startResult = startOngoingNotification(payload, options.copy(notificationId = notificationId))
                return@withContext AndroidOngoingNotificationUpsertResult(
                    ok = startResult.ok,
                    notificationId = startResult.notificationId,
                    action = if (startResult.ok) "started" else null,
                    reason = startResult.reason,
                    promotion = startResult.promotion,
                    styleFallback = startResult.styleFallback,
                    foregroundService = startResult.foregroundService,
                )
            }

            // The update branch attaches the service when the notification is not backed by it yet:
            // a push that started the notification from the background may have been refused, and a
            // later high-priority push should still be able to attach.
            val foregroundServiceOptions = options.foregroundService
            val alreadyAttached =
                foregroundServiceOptions != null && foregroundService.attachedNotificationId() == notificationId
            val attachOptions = foregroundServiceOptions.takeUnless { alreadyAttached }
            val blocker = attachOptions?.let { checkForegroundServiceAvailability(it.type, notificationId) }
            if (!currentRecord.dismissed && !isStaleRevision(notificationId, currentRecord, options.revision)) {
                rejectBeforePostingIfRequired(notificationId, attachOptions, blocker)
            }

            val applied =
                applyUpdate(
                    notificationId,
                    payload,
                    options.copy(notificationId = null, foregroundService = null),
                    attachOptions,
                )
            val foregroundServiceResult =
                when {
                    !applied.result.ok || foregroundServiceOptions == null -> {
                        null
                    }

                    alreadyAttached -> {
                        AndroidOngoingNotificationForegroundServiceResult.attached(
                            currentRecord.foregroundServiceType ?: foregroundServiceOptions.type,
                        )
                    }

                    else -> {
                        attachForegroundService(applied.record!!, applied.notification!!, attachOptions!!, blocker)
                    }
                }
            AndroidOngoingNotificationUpsertResult(
                ok = applied.result.ok,
                notificationId = notificationId,
                action = if (applied.result.ok) "updated" else null,
                reason = applied.result.reason,
                promotion = applied.result.promotion,
                styleFallback = applied.result.styleFallback,
                foregroundService = foregroundServiceResult,
            )
        }

    suspend fun stopOngoingNotification(
        notificationId: String,
        revision: Long? = null,
    ): AndroidOngoingNotificationStopResult {
        val record =
            getRecord(notificationId)
                ?: return AndroidOngoingNotificationStopResult(
                    ok = false,
                    notificationId = notificationId,
                    reason = "not_found",
                )
        if (isStaleRevision(notificationId, record, revision)) {
            return AndroidOngoingNotificationStopResult(
                ok = false,
                notificationId = notificationId,
                reason = REASON_STALE_REVISION,
            )
        }
        // cancel() is ignored for a notification that backs a foreground service, so the service
        // has to release it first.
        if (foregroundService.attachedNotificationId() == notificationId) {
            foregroundService.stop(notificationId, removeNotification = true)
        }
        notificationManager.cancel(record.systemNotificationId)
        removeRecord(notificationId)
        removePayload(notificationId)
        maxRevision(record.lastRevision, revision)?.let { writeTombstone(notificationId, it) }
        notifyEnded(notificationId, ENDED_REASON_STOPPED)
        return AndroidOngoingNotificationStopResult(
            ok = true,
            notificationId = notificationId,
            action = "stopped",
        )
    }

    fun isOngoingNotificationActive(notificationId: String): Boolean =
        getOngoingNotificationStatus(notificationId).isActive

    fun getOngoingNotificationStatus(notificationId: String): AndroidOngoingNotificationStatus {
        val record = getRecord(notificationId)
        if (record == null) {
            return AndroidOngoingNotificationStatus(
                isActive = false,
                isDismissed = false,
            )
        }

        val activeNotification = getActiveStatusBarNotification(record.systemNotificationId)
        val notification = activeNotification?.notification
        val isActive = activeNotification != null
        val isPromoted =
            if (Build.VERSION.SDK_INT >= 36 && notification != null) {
                (notification.flags and Notification.FLAG_PROMOTED_ONGOING) != 0
            } else {
                null
            }
        val hasPromotableCharacteristics =
            if (Build.VERSION.SDK_INT >= 36 && notification != null) {
                notification.hasPromotableCharacteristics()
            } else {
                null
            }

        return AndroidOngoingNotificationStatus(
            isActive = isActive,
            isDismissed = record.dismissed,
            isPromoted = isPromoted,
            hasPromotableCharacteristics = hasPromotableCharacteristics,
            foregroundService =
                record.foregroundServiceType?.let { type ->
                    AndroidOngoingNotificationForegroundServiceStatus(
                        type = type,
                        state = record.foregroundServiceState ?: FOREGROUND_SERVICE_STATE_DETACHED,
                    )
                },
        )
    }

    fun getOngoingNotificationHandle(notificationId: String): AndroidOngoingNotificationHandle? =
        getRecord(notificationId)?.let { AndroidOngoingNotificationHandle(it.notificationId, it.systemNotificationId) }

    /**
     * Rebuilds the notification last posted for [notificationId] from its record and stored payload,
     * or null when either is gone. Never posts.
     */
    internal fun buildNotificationFromRecord(notificationId: String): AndroidOngoingNotificationBuilt? {
        val record = getRecord(notificationId) ?: return null
        val payload = readPayload(notificationId) ?: return null
        return try {
            val parsedPayload = AndroidOngoingNotificationPayloadParser.parseValidated(payload)
            AndroidOngoingNotificationBuilt(
                systemNotificationId = record.systemNotificationId,
                notification = buildNotification(record, parsedPayload, onlyAlertOnce = true),
            )
        } catch (error: Exception) {
            Log.e(TAG, "Could not rebuild ongoing notification $notificationId", error)
            null
        }
    }

    suspend fun endAllOngoingNotifications() {
        val records = getRecords()
        // Not limited to recorded notifications: a service holding a notification Voltra no longer
        // tracks must be released too, or every later attach would report `busy`.
        foregroundService.attachedNotificationId()?.let { attachedId ->
            foregroundService.stop(attachedId, removeNotification = true)
        }
        records.values.forEach { record ->
            notificationManager.cancel(record.systemNotificationId)
        }
        clearRecords()
        records.keys.forEach { removePayload(it) }
        records.values.forEach { record -> record.lastRevision?.let { writeTombstone(record.notificationId, it) } }
        records.keys.forEach { notificationId -> notifyEnded(notificationId, ENDED_REASON_STOPPED) }
    }

    fun canPostPromotedAndroidNotifications(): Boolean =
        getOngoingNotificationCapabilities().canPostPromotedNotifications

    fun getOngoingNotificationCapabilities(): AndroidOngoingNotificationCapabilities {
        val notificationsEnabled = notificationManager.areNotificationsEnabled()
        val supportsPromoted = Build.VERSION.SDK_INT >= PROMOTION_MIN_SDK
        val canPostPromoted =
            supportsPromoted &&
                notificationsEnabled &&
                notificationManager.canPostPromotedNotifications() &&
                hasPromotedNotificationsPermission(appContext)
        val declaredForegroundServiceTypes = foregroundService.declaredTypes()

        return AndroidOngoingNotificationCapabilities(
            apiLevel = Build.VERSION.SDK_INT,
            notificationsEnabled = notificationsEnabled,
            supportsPromotedNotifications = supportsPromoted,
            canPostPromotedNotifications = canPostPromoted,
            canRequestPromotedOngoing = canPostPromoted,
            // Android 14 made FLAG_ONGOING_EVENT dismissible; a foreground service does not change that.
            isUserDismissible = Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE,
            supportsForegroundService = declaredForegroundServiceTypes != null,
            foregroundServiceTypes =
                AndroidOngoingNotificationForegroundServiceTypes.all
                    .map { it.name }
                    .filter { declaredForegroundServiceTypes?.contains(it) == true },
        )
    }

    private fun AndroidOngoingNotificationRecord.withForegroundService(
        options: AndroidOngoingNotificationForegroundServiceOptions?,
    ): AndroidOngoingNotificationRecord =
        copy(
            foregroundServiceType = options?.type,
            foregroundServiceOnDismiss = options?.onDismiss ?: FOREGROUND_SERVICE_ON_DISMISS_STOP,
            foregroundServiceState = null,
        )

    /** The reason the service cannot be attached, checked before anything is posted or started. */
    private fun checkForegroundServiceAvailability(
        type: String,
        notificationId: String,
    ): AndroidOngoingNotificationForegroundServiceResult? {
        val declaredTypes =
            foregroundService.declaredTypes()
                ?: return AndroidOngoingNotificationForegroundServiceResult.failed("not_declared")
        val serviceType =
            AndroidOngoingNotificationForegroundServiceTypes.byName(type)
                ?: return AndroidOngoingNotificationForegroundServiceResult.failed("type_not_declared")
        // Below API 29 startForeground takes no type, so there is nothing to check against.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (Build.VERSION.SDK_INT < serviceType.minSdk) {
                return AndroidOngoingNotificationForegroundServiceResult.failed("unsupported_api")
            }
            if (type !in declaredTypes) {
                return AndroidOngoingNotificationForegroundServiceResult.failed("type_not_declared")
            }
        }
        val attachedId = foregroundService.attachedNotificationId()
        if (attachedId != null && attachedId != notificationId) {
            return AndroidOngoingNotificationForegroundServiceResult.failed("busy")
        }
        foregroundService.missingPrerequisite(type)?.let {
            return AndroidOngoingNotificationForegroundServiceResult.failed(it)
        }
        return null
    }

    /**
     * With `fallbackBehavior: 'error'`, a failure known before posting rejects before anything is
     * posted, so the user never sees (or hears) a notification that is taken down again.
     */
    private fun rejectBeforePostingIfRequired(
        notificationId: String,
        options: AndroidOngoingNotificationForegroundServiceOptions?,
        blocker: AndroidOngoingNotificationForegroundServiceResult?,
    ) {
        if (options == null || blocker == null) return
        if (resolveFallbackBehavior(options.fallbackBehavior) !=
            AndroidOngoingNotificationFallbackBehavior.ERROR
        ) {
            return
        }
        throw foregroundServiceUnavailable(notificationId, blocker.reason)
    }

    private fun foregroundServiceUnavailable(
        notificationId: String,
        reason: String?,
    ) = VoltraNotificationException(
        VoltraNotificationException.FOREGROUND_SERVICE_UNAVAILABLE,
        "Foreground service could not be attached to ongoing notification '$notificationId': $reason",
    )

    /**
     * Runs after the notification is posted and its record saved. The service goes foreground with
     * [notification] as posted. With `fallbackBehavior: 'error'` a failure takes the notification
     * down again and rejects; the revision it carried is kept so an older push cannot restart it.
     */
    private suspend fun attachForegroundService(
        record: AndroidOngoingNotificationRecord,
        notification: Notification,
        options: AndroidOngoingNotificationForegroundServiceOptions,
        blocker: AndroidOngoingNotificationForegroundServiceResult?,
    ): AndroidOngoingNotificationForegroundServiceResult {
        val result =
            blocker ?: run {
                VoltraOngoingNotificationForegroundServiceRegistry.offerPostedNotification(
                    record.notificationId,
                    notification,
                )
                try {
                    foregroundService.attach(
                        record.notificationId,
                        options.type,
                        record.systemNotificationId,
                        record.channelId,
                    )
                } finally {
                    VoltraOngoingNotificationForegroundServiceRegistry.takePostedNotification(record.notificationId)
                }
            }
        if (result.attached) {
            return result
        }

        updateForegroundServiceState(appContext, record.notificationId, FOREGROUND_SERVICE_STATE_FAILED)
        if (resolveFallbackBehavior(options.fallbackBehavior) == AndroidOngoingNotificationFallbackBehavior.ERROR) {
            notificationManager.cancel(record.systemNotificationId)
            removeRecord(record.notificationId)
            removePayload(record.notificationId)
            record.lastRevision?.let { writeTombstone(record.notificationId, it) }
            throw foregroundServiceUnavailable(record.notificationId, result.reason)
        }
        return result
    }

    /** After process death the service is gone, so no record may still claim it is attached. */
    private fun reconcileForegroundServiceStates() {
        synchronized(lock) {
            val records = readRecords(prefs)
            val attachedId = foregroundService.attachedNotificationId()
            val stale =
                records.values.filter {
                    it.foregroundServiceState == FOREGROUND_SERVICE_STATE_ATTACHED && it.notificationId != attachedId
                }
            if (stale.isEmpty()) return
            val updated = records.toMutableMap()
            stale.forEach {
                updated[it.notificationId] =
                    it.copy(foregroundServiceState = FOREGROUND_SERVICE_STATE_DETACHED)
            }
            writeRecords(prefs, updated)
        }
    }

    // Payloads can carry inline images, so each one lives under its own key: an update rewrites
    // only its own payload, not every record's.
    private fun writePayload(
        notificationId: String,
        payload: String,
    ) {
        prefs.edit().putString(KEY_PAYLOAD_PREFIX + notificationId, payload).apply()
    }

    private fun readPayload(notificationId: String): String? =
        prefs.getString(KEY_PAYLOAD_PREFIX + notificationId, null)

    private fun removePayload(notificationId: String) {
        prefs.edit().remove(KEY_PAYLOAD_PREFIX + notificationId).apply()
    }

    private fun isStaleRevision(
        notificationId: String,
        record: AndroidOngoingNotificationRecord?,
        revision: Long?,
    ): Boolean {
        if (revision == null) return false
        val lastRevision = record?.lastRevision ?: readTombstone(notificationId) ?: return false
        return revision <= lastRevision
    }

    private fun maxRevision(
        current: Long?,
        incoming: Long?,
    ): Long? = listOfNotNull(current, incoming).maxOrNull()

    private fun readTombstones(): Map<String, Long> {
        val raw = prefs.getString(KEY_REVISION_TOMBSTONES, null) ?: return emptyMap()
        return try {
            json.decodeFromString<Map<String, Long>>(raw)
        } catch (error: Exception) {
            Log.e(TAG, "Failed to decode ongoing notification revision tombstones", error)
            emptyMap()
        }
    }

    private fun readTombstone(notificationId: String): Long? = synchronized(lock) { readTombstones()[notificationId] }

    private fun writeTombstone(
        notificationId: String,
        revision: Long,
    ) {
        synchronized(lock) {
            // Re-inserting moves the entry to the end, so the oldest stop is the first one dropped.
            val tombstones = LinkedHashMap(readTombstones())
            tombstones.remove(notificationId)
            tombstones[notificationId] = revision
            while (tombstones.size > MAX_REVISION_TOMBSTONES) {
                tombstones.remove(tombstones.keys.first())
            }
            prefs.edit().putString(KEY_REVISION_TOMBSTONES, json.encodeToString<Map<String, Long>>(tombstones)).commit()
        }
    }

    private fun removeTombstone(notificationId: String) {
        synchronized(lock) {
            val tombstones = readTombstones()
            if (notificationId !in tombstones) return
            prefs.edit().putString(KEY_REVISION_TOMBSTONES, json.encodeToString(tombstones - notificationId)).commit()
        }
    }

    // Settings.ACTION_APP_NOTIFICATION_SETTINGS only resolves to an activity on API 26+.
    // On 24-25 no activity handles it and startActivity throws ActivityNotFoundException,
    // so fall back to the app details screen, which has existed since API 9. The same
    // fallback applies on 26+ devices that ship no activity for the action (Android TV,
    // Automotive, stripped OEM ROMs): neither start may propagate ActivityNotFoundException.
    fun openAppNotificationSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelList =
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                    putExtra(Settings.EXTRA_APP_PACKAGE, appContext.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            try {
                appContext.startActivity(channelList)
                return
            } catch (_: ActivityNotFoundException) {
                // No channel-list page on this device: fall through to app details.
            }
        }

        val appDetails =
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", appContext.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        try {
            appContext.startActivity(appDetails)
        } catch (error: ActivityNotFoundException) {
            // Pathological ROM with no details page either: keep it in logcat, never
            // across the bridge.
            Log.w(TAG, "No activity handles the notification settings fallback", error)
        }
    }

    /**
     * Opens the system page where the user turns Live Updates on for this app. Returns
     * true when the promotion settings activity opened and false when it fell back to
     * the app notification settings (below API 36, or on devices where no activity
     * handles the action — the Settings reference warns it may be missing). The fallback
     * chain (channel list → app details) never throws either.
     */
    fun openPromotedNotificationSettings(): Boolean {
        if (Build.VERSION.SDK_INT >= PROMOTION_MIN_SDK) {
            val intent =
                Intent(Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS).apply {
                    putExtra(Settings.EXTRA_APP_PACKAGE, appContext.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

            try {
                if (intent.resolveActivity(appContext.packageManager) != null) {
                    appContext.startActivity(intent)
                    return true
                }
            } catch (_: ActivityNotFoundException) {
                // Racing an uninstall/overlay change between resolve and start: fall through.
            }
        }

        openAppNotificationSettings()
        return false
    }

    private fun createGeneratedNotificationId(): String {
        val intId = allocateNotificationId()
        return "ongoing-notification-$intId"
    }

    // Notification.Builder(Context, String) is API 26. Notification channels don't exist
    // below API 26, so falling back to the single-arg constructor (and discarding
    // channelId) on 24-25 is correct behavior, not a compromise.
    @Suppress("DEPRECATION")
    private fun newBuilder(channelId: String?): Builder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && channelId != null) {
            Builder(appContext, channelId)
        } else {
            Builder(appContext).setPriority(Notification.PRIORITY_DEFAULT)
        }

    /**
     * The pre-flight twin of a post: same payload, channel and eligibility checks, and
     * the same build so `hasPromotableCharacteristics()` is available — but it never
     * calls `notify()` and never writes a record.
     */
    suspend fun checkAndroidOngoingNotificationPromotion(
        payload: String,
        options: AndroidOngoingNotificationOptions,
    ): AndroidOngoingNotificationPromotionInfo =
        withContext(Dispatchers.Default) {
            val parsedPayload = AndroidOngoingNotificationPayloadParser.parseValidated(payload)
            val channelId =
                options.channelId
                    ?: throw VoltraNotificationException(
                        VoltraNotificationException.CHANNEL_REQUIRED,
                        "channelId is required for Android ongoing notifications.",
                    )
            ensureChannelExists(channelId)

            // A record stand-in that is never saved. The negative system id keeps the
            // content and delete PendingIntents built for this throwaway notification
            // from sharing a request code with any real ongoing notification.
            val transientRecord =
                AndroidOngoingNotificationRecord(
                    notificationId = PROMOTION_CHECK_NOTIFICATION_ID,
                    systemNotificationId = PROMOTION_CHECK_SYSTEM_NOTIFICATION_ID,
                    channelId = channelId,
                    smallIcon = options.smallIcon,
                    requestPromotedOngoing = true,
                    fallbackBehavior = "standard",
                )

            val notification = buildNotification(transientRecord, parsedPayload, onlyAlertOnce = false)
            promotionEvaluator.evaluate(parsedPayload, channelId, notification)
        }

    private class PostedNotification(
        val notification: Notification,
        val promotion: AndroidOngoingNotificationPromotionInfo?,
    )

    private fun postNotification(
        record: AndroidOngoingNotificationRecord,
        payload: AndroidOngoingNotificationPayload,
        onlyAlertOnce: Boolean,
    ): PostedNotification {
        ensureChannelExists(record.channelId)

        val notification = buildNotification(record, payload, onlyAlertOnce)
        // Evaluates before notify(): with fallbackBehavior 'error' an ineligible
        // notification must leave nothing posted and no record written.
        val promotion = evaluatePromotion(record, payload, notification)

        notificationManager.notify(record.systemNotificationId, notification)
        return PostedNotification(notification, promotion)
    }

    private fun buildNotification(
        record: AndroidOngoingNotificationRecord,
        payload: AndroidOngoingNotificationPayload,
        onlyAlertOnce: Boolean,
    ): Notification {
        val builder =
            newBuilder(record.channelId)
                .setSmallIcon(resolveSmallIcon(record.smallIcon))
                .setOngoing(true)
                .setOnlyAlertOnce(onlyAlertOnce)
                .setDeleteIntent(createDeleteIntent(record))
                .setContentIntent(createContentIntent(record))

        val category = resolveNotificationCategory(record, payload)
        builder.applyAndroidOngoingNotificationPresentation(record.presentation)
        category?.let { builder.setCategory(it) }

        payload.title?.let { builder.setContentTitle(it) }

        applyCommonFields(builder, payload)
        applyPayloadStyle(builder, payload)
        applyActions(builder, record, payload)
        requestPromotionIfPossible(builder, record)
        // Android 12 may hold back a foreground service notification for up to ten seconds.
        if (record.foregroundServiceType != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
        }

        payload.publicVersion?.let { publicVersion ->
            builder.setPublicVersion(buildPublicVersion(record, payload, publicVersion, category))
        }

        return insetPromotedLargeIcon(builder, builder.build(), record, payload)
    }

    // Some platform builds (Samsung One UI 8) give a promoted notification's large icon no end
    // margin, so the card's rounded corner clips it. The padding is baked in only when the
    // notification will actually be promoted: an unpromoted one keeps the platform's own margin.
    private fun insetPromotedLargeIcon(
        builder: Builder,
        notification: Notification,
        record: AndroidOngoingNotificationRecord,
        payload: AndroidOngoingNotificationPayload,
    ): Notification {
        if (!record.requestPromotedOngoing) return notification
        val largeIcon = notification.getLargeIcon() ?: return notification
        val insetRatio = PromotedLargeIconInset.requiredInsetRatio() ?: return notification
        if (!promotionEvaluator.evaluate(payload, record.channelId, notification).eligible) return notification

        builder.setLargeIcon(PromotedLargeIconInset.apply(appContext, largeIcon, insetRatio))
        return builder.build()
    }

    // The platform decides promotion at post time from the request bit plus the user
    // preference, so writing the bit while the preference is off is what makes the next
    // update promoted after the user enables Live Updates, without an app change.
    private fun evaluatePromotion(
        record: AndroidOngoingNotificationRecord,
        payload: AndroidOngoingNotificationPayload,
        notification: Notification,
    ): AndroidOngoingNotificationPromotionInfo? {
        if (!record.requestPromotedOngoing) {
            return null
        }

        val promotion = promotionEvaluator.evaluate(payload, record.channelId, notification)

        if (!promotion.eligible &&
            resolveFallbackBehavior(record.fallbackBehavior) == AndroidOngoingNotificationFallbackBehavior.ERROR
        ) {
            throw VoltraNotificationException(
                VoltraNotificationException.NOT_PROMOTABLE,
                "Promoted ongoing notification is not eligible on this device/app configuration: " +
                    promotion.reasons.joinToString(", "),
            )
        }

        return promotion
    }

    // notify() on a channel id that getNotificationChannel does not return silently
    // drops the notification on API 26+, so a missing channel becomes an explicit
    // rejection instead of an ok: true that posted nothing.
    private fun ensureChannelExists(channelId: String?) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || channelId == null) {
            return
        }

        if (notificationManager.getNotificationChannel(channelId) == null) {
            throw VoltraNotificationException(
                VoltraNotificationException.CHANNEL_NOT_FOUND,
                "Notification channel '$channelId' does not exist. Create it before posting ongoing notifications.",
            )
        }
    }

    /**
     * Builds the lock-screen copy of a notification whose private content should not be readable
     * from the lock screen.
     *
     * It carries the channel, icon, colour, category and timestamp rules of the main notification,
     * so it reads as the same notification, and nothing else: no style, no progress and no actions,
     * because everything the private content reveals lives in the main notification.
     */
    private fun buildPublicVersion(
        record: AndroidOngoingNotificationRecord,
        payload: AndroidOngoingNotificationPayload,
        publicVersion: AndroidOngoingNotificationPublicVersionPayload,
        category: String?,
    ): Notification {
        val builder =
            newBuilder(record.channelId)
                .setSmallIcon(resolveSmallIcon(record.smallIcon))
                .setOngoing(true)
                .setContentTitle(publicVersion.title)
                .setVisibility(Notification.VISIBILITY_PUBLIC)

        publicVersion.text?.let { builder.setContentText(it) }
        androidOngoingNotificationColor(record.presentation.color)?.let { builder.setColor(it) }
        category?.let { builder.setCategory(it) }
        applyTimestampFields(builder, payload)

        return builder.build()
    }

    private fun applyCommonFields(
        builder: Builder,
        payload: AndroidOngoingNotificationPayload,
    ) {
        when (payload) {
            is AndroidOngoingNotificationProgressPayload -> {
                builder.setContentText(payload.text)
                builder.setProgress(payload.max, payload.value, payload.indeterminate == true)
            }

            is AndroidOngoingNotificationBigTextPayload -> {
                builder.setContentText(payload.text)
            }

            is AndroidOngoingNotificationBigPicturePayload -> {
                builder.setContentText(payload.text)
            }

            is AndroidOngoingNotificationInboxPayload -> {
                builder.setContentText(payload.text)
            }

            // The metrics render through the style (or the fallback text line set there).
            is AndroidOngoingNotificationMetricPayload -> {
                Unit
            }
        }

        payload.subText?.let { builder.setSubText(it) }

        resolveNotificationIcon(payload.largeIcon)?.let { builder.setLargeIcon(it) }

        if (Build.VERSION.SDK_INT >= 36) {
            payload.shortCriticalText?.let { builder.setShortCriticalText(it) }
        }

        applyTimestampFields(builder, payload)
    }

    /**
     * Applies the timestamp block, shared by the notification and its public version so both show
     * time the same way.
     *
     * `showWhen` defaults to the pre-existing behaviour: the timestamp is shown whenever the payload
     * carries a `when` or a chronometer, and hidden otherwise. Overriding it to false lets an app
     * keep `when` for ordering, or for the Live Update chip, without printing the time.
     */
    private fun applyTimestampFields(
        builder: Builder,
        payload: AndroidOngoingNotificationPayload,
    ) {
        val hasTimestamp = payload.whenEpochMillis != null || payload.chronometer == true

        if (hasTimestamp) {
            builder.setWhen(payload.whenEpochMillis ?: System.currentTimeMillis())
            // Remote payloads bypass the renderer (which always pairs the two flags), so
            // a countdown may arrive without `chronometer: true`. A countdown chip is
            // still a chip: show the chronometer rather than a static timestamp.
            builder.setUsesChronometer(payload.chronometer == true || payload.chronometerCountDown == true)
            // Validation guarantees a countdown always has `when` to count down to.
            // setChronometerCountDown is API 24 — Voltra's minSdk — so no gate is needed.
            if (payload.chronometerCountDown == true) {
                builder.setChronometerCountDown(true)
            }
        }

        builder.setShowWhen(payload.showWhen ?: hasTimestamp)
    }

    private fun applyPayloadStyle(
        builder: Builder,
        payload: AndroidOngoingNotificationPayload,
    ) {
        when (payload) {
            is AndroidOngoingNotificationBigTextPayload -> {
                builder.setStyle(BigTextStyle().bigText(payload.bigText ?: payload.text))
            }

            is AndroidOngoingNotificationProgressPayload -> {
                if (Build.VERSION.SDK_INT >= 36) {
                    val style =
                        Notification
                            .ProgressStyle()
                            .setProgress(
                                payload.value,
                            ).setProgressIndeterminate(payload.indeterminate == true)
                            .setStyledByProgress(true)

                    resolveNotificationIcon(payload.progressTrackerIcon)?.let { style.setProgressTrackerIcon(it) }
                    resolveNotificationIcon(payload.progressStartIcon)?.let { style.setProgressStartIcon(it) }
                    resolveNotificationIcon(payload.progressEndIcon)?.let { style.setProgressEndIcon(it) }

                    payload.segments?.forEach { segment ->
                        style.addProgressSegment(segment.toNativeSegment())
                    }

                    payload.points?.forEach { point ->
                        style.addProgressPoint(point.toNativePoint())
                    }

                    builder.setStyle(style)
                }
            }

            is AndroidOngoingNotificationBigPicturePayload -> {
                applyBigPictureStyle(builder, payload)
            }

            is AndroidOngoingNotificationInboxPayload -> {
                applyInboxStyle(builder, payload)
            }

            is AndroidOngoingNotificationMetricPayload -> {
                if (canUseMetricStyle()) {
                    builder.setStyle(buildMetricStyle(payload))
                } else {
                    builder.setContentText(renderMetricFallbackText(payload))
                }
            }
        }
    }

    /**
     * The `category` option wins over the payload default; an unknown value is dropped rather than
     * posted, so a push written for a newer release cannot smuggle in a category Voltra does not
     * support.
     */
    private fun resolveNotificationCategory(
        record: AndroidOngoingNotificationRecord,
        payload: AndroidOngoingNotificationPayload,
    ): String? = androidOngoingNotificationCategory(record.presentation.category) ?: getNotificationCategory(payload)

    /**
     * Notification.BigPictureStyle only began accepting [Icon] in API 31, so older releases get
     * decoded pixels instead. Both paths carry the same downscale cap.
     */
    private fun applyBigPictureStyle(
        builder: Builder,
        payload: AndroidOngoingNotificationBigPicturePayload,
    ) {
        val style = Notification.BigPictureStyle()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            imageResolver
                .resolveIcon(payload.picture, MAX_PICTURE_LONG_EDGE_PX)
                ?.let { style.bigPicture(it) }

            payload.pictureContentDescription?.let { style.setContentDescription(it) }
            payload.showPictureWhenCollapsed?.let { style.showBigPictureWhenCollapsed(it) }
        } else {
            imageResolver
                .resolveBitmap(payload.picture, MAX_PICTURE_LONG_EDGE_PX)
                ?.let { style.bigPicture(it) }
        }

        // An expanded thumbnail wins over hiding one, but only one that actually decoded. Artwork
        // that failed to resolve has to fall through to an explicit hide, otherwise asking to drop
        // the thumbnail would end up showing the collapsed one in its place.
        val bigLargeIcon = payload.bigLargeIcon?.let { imageResolver.resolveIcon(it, MAX_ICON_LONG_EDGE_PX) }

        when {
            bigLargeIcon != null -> style.bigLargeIcon(bigLargeIcon)

            // Passing an explicit null marks the expanded thumbnail as cleared, which is how the
            // platform expresses "thumbnail only while collapsed". Leaving the key unset instead
            // would keep showing the collapsed large icon.
            payload.hideLargeIconWhenExpanded == true -> style.bigLargeIcon(null as Icon?)
        }

        payload.summaryText?.let { style.setSummaryText(it) }

        builder.setStyle(style)
    }

    private fun applyInboxStyle(
        builder: Builder,
        payload: AndroidOngoingNotificationInboxPayload,
    ) {
        val style = Notification.InboxStyle()

        if (payload.lines.isEmpty()) {
            Log.w(TAG, "Inbox ongoing notification carries no lines, the expanded view stays empty")
        } else if (payload.lines.size > MAX_INBOX_LINES) {
            Log.w(
                TAG,
                "Inbox ongoing notification carries ${payload.lines.size} lines, " +
                    "posting the first $MAX_INBOX_LINES",
            )
        }

        payload.lines.take(MAX_INBOX_LINES).forEach { line -> style.addLine(line) }

        payload.summaryText?.let { style.setSummaryText(it) }

        builder.setStyle(style)
    }

    private fun getNotificationCategory(payload: AndroidOngoingNotificationPayload): String? =
        when (payload) {
            // Metrics double as live-update material, which requires a progress (or call)
            // category for promotable characteristics.
            is AndroidOngoingNotificationProgressPayload -> Notification.CATEGORY_PROGRESS

            is AndroidOngoingNotificationMetricPayload -> Notification.CATEGORY_PROGRESS

            is AndroidOngoingNotificationBigTextPayload -> null

            is AndroidOngoingNotificationBigPicturePayload -> null

            is AndroidOngoingNotificationInboxPayload -> null
        }

    /**
     * Notification artwork is rendered at 48dp at most, so everything reaching this point is capped
     * at the icon size. A source that cannot be decoded yields null: a broken image must not stop a
     * status update.
     */
    private fun resolveNotificationIcon(source: AndroidOngoingNotificationImageSource?): Icon? =
        imageResolver.resolveIcon(source, MAX_ICON_LONG_EDGE_PX)

    private fun getActiveStatusBarNotification(
        systemNotificationId: Int,
    ): android.service.notification.StatusBarNotification? =
        if (Build.VERSION.SDK_INT >= 23) {
            notificationManager.activeNotifications.firstOrNull { notification ->
                notification.id == systemNotificationId && notification.packageName == appContext.packageName
            }
        } else {
            null
        }

    @RequiresApi(36)
    private fun AndroidOngoingNotificationProgressSegmentPayload.toNativeSegment(): Notification.ProgressStyle.Segment {
        val segment = Notification.ProgressStyle.Segment(length)
        androidOngoingNotificationColor(color)?.let { segment.setColor(it) }
        return segment
    }

    @RequiresApi(36)
    private fun AndroidOngoingNotificationProgressPointPayload.toNativePoint(): Notification.ProgressStyle.Point {
        val point = Notification.ProgressStyle.Point(position)
        androidOngoingNotificationColor(color)?.let { point.setColor(it) }
        return point
    }

    // Metrics have a real presentation only from API 37, and only when the app compiles against
    // SDK 37; otherwise the post succeeds as a standard notification whose contentText lists
    // the readings, and the result says so.
    private fun resolveStyleFallback(payload: AndroidOngoingNotificationPayload): String? =
        if (payload is AndroidOngoingNotificationMetricPayload && !canUseMetricStyle()) {
            "standard"
        } else {
            null
        }

    private fun requestPromotionIfPossible(
        builder: Builder,
        record: AndroidOngoingNotificationRecord,
    ) {
        // Written whenever requested, regardless of canPostPromotedNotifications(): the
        // user preference is the system's to apply at post time, and the bit is what
        // lets the next update be promoted after the user enables Live Updates.
        if (!record.requestPromotedOngoing || Build.VERSION.SDK_INT < PROMOTION_MIN_SDK) {
            return
        }

        val extras = builder.extras ?: android.os.Bundle()
        extras.putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true)
        builder.setExtras(extras)
    }

    private fun applyActions(
        builder: Builder,
        record: AndroidOngoingNotificationRecord,
        payload: AndroidOngoingNotificationPayload,
    ) {
        payload.actions?.forEachIndexed { index, action ->
            val pendingIntent = createActionIntent(record, action, index) ?: return@forEachIndexed
            val actionBuilder =
                Notification.Action.Builder(
                    resolveNotificationIcon(action.icon),
                    action.title,
                    pendingIntent,
                )
            builder.addAction(actionBuilder.build())
        }
    }

    private fun createContentIntent(record: AndroidOngoingNotificationRecord): PendingIntent? {
        val intent =
            createLaunchIntent(record.deepLinkUrl)
                ?: appContext.packageManager.getLaunchIntentForPackage(appContext.packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                }

        return intent?.let {
            PendingIntent.getActivity(
                appContext,
                record.systemNotificationId,
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }
    }

    private fun createActionIntent(
        record: AndroidOngoingNotificationRecord,
        action: AndroidOngoingNotificationActionPayload,
        index: Int,
    ): PendingIntent? {
        val intent = createLaunchIntent(action.deepLinkUrl) ?: return null

        return PendingIntent.getActivity(
            appContext,
            createActionRequestCode(record.systemNotificationId, index),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun createLaunchIntent(deepLinkUrl: String?): Intent? {
        if (deepLinkUrl.isNullOrBlank()) {
            return null
        }

        return Intent(Intent.ACTION_VIEW, Uri.parse(deepLinkUrl)).apply {
            setPackage(appContext.packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
    }

    private fun createActionRequestCode(
        notificationId: Int,
        index: Int,
    ): Int = (notificationId * 100) + index + 1

    private fun createDeleteIntent(record: AndroidOngoingNotificationRecord): PendingIntent {
        val intent =
            Intent(appContext, VoltraOngoingNotificationDismissedReceiver::class.java).apply {
                putExtra(EXTRA_NOTIFICATION_ID, record.notificationId)
            }

        return PendingIntent.getBroadcast(
            appContext,
            record.systemNotificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun resolveSmallIcon(iconName: String?): Int {
        if (!iconName.isNullOrBlank()) {
            val drawableId = appContext.resources.getIdentifier(iconName, "drawable", appContext.packageName)
            if (drawableId != 0) {
                return drawableId
            }

            val mipmapId = appContext.resources.getIdentifier(iconName, "mipmap", appContext.packageName)
            if (mipmapId != 0) {
                return mipmapId
            }
        }

        return appContext.applicationInfo.icon
    }

    private fun resolveFallbackBehavior(fallbackBehavior: String?): AndroidOngoingNotificationFallbackBehavior =
        if (fallbackBehavior.equals("error", ignoreCase = true)) {
            AndroidOngoingNotificationFallbackBehavior.ERROR
        } else {
            AndroidOngoingNotificationFallbackBehavior.STANDARD
        }

    private fun createMergedRecord(
        notificationId: String,
        currentRecord: AndroidOngoingNotificationRecord?,
        options: AndroidOngoingNotificationOptions,
        allowMissingChannel: Boolean,
    ): AndroidOngoingNotificationRecord {
        val channelId = options.channelId ?: currentRecord?.channelId
        if (channelId.isNullOrBlank() && !allowMissingChannel) {
            throw VoltraNotificationException(
                VoltraNotificationException.CHANNEL_REQUIRED,
                "channelId is required for Android ongoing notifications.",
            )
        }

        val systemNotificationId = currentRecord?.systemNotificationId ?: allocateNotificationId()

        return AndroidOngoingNotificationRecord(
            notificationId = notificationId,
            systemNotificationId = systemNotificationId,
            channelId =
                channelId
                    ?: throw VoltraNotificationException(
                        VoltraNotificationException.CHANNEL_REQUIRED,
                        "channelId is required for Android ongoing notifications.",
                    ),
            smallIcon = options.smallIcon ?: currentRecord?.smallIcon,
            deepLinkUrl = options.deepLinkUrl ?: currentRecord?.deepLinkUrl,
            requestPromotedOngoing =
                if (options.requestPromotedOngoing != null) {
                    options.requestPromotedOngoing
                } else {
                    currentRecord?.requestPromotedOngoing ?: false
                },
            fallbackBehavior = options.fallbackBehavior ?: currentRecord?.fallbackBehavior ?: "standard",
            presentation =
                (currentRecord?.presentation ?: AndroidOngoingNotificationPresentation())
                    .mergedWith(options.presentation),
            active = currentRecord?.active ?: true,
            dismissed = currentRecord?.dismissed ?: false,
            lastRevision = currentRecord?.lastRevision,
            foregroundServiceType = currentRecord?.foregroundServiceType,
            foregroundServiceOnDismiss =
                currentRecord?.foregroundServiceOnDismiss ?: FOREGROUND_SERVICE_ON_DISMISS_STOP,
            foregroundServiceState = currentRecord?.foregroundServiceState,
        )
    }

    private fun getRecord(notificationId: String): AndroidOngoingNotificationRecord? =
        synchronized(lock) {
            getRecords()[notificationId]
        }

    private fun getRecords(): Map<String, AndroidOngoingNotificationRecord> = readRecords(prefs)

    private fun saveRecord(record: AndroidOngoingNotificationRecord) {
        synchronized(lock) {
            val records = readRecords(prefs).toMutableMap()
            records[record.notificationId] = record
            writeRecords(prefs, records)
        }
    }

    private fun removeRecord(notificationId: String) {
        synchronized(lock) {
            val records = readRecords(prefs).toMutableMap()
            records.remove(notificationId)
            writeRecords(prefs, records)
        }
    }

    private fun clearRecords() {
        synchronized(lock) {
            prefs.edit().remove(KEY_RECORDS).commit()
        }
    }

    private fun allocateNotificationId(): Int =
        synchronized(lock) {
            val nextId = prefs.getInt(KEY_NEXT_NOTIFICATION_ID, DEFAULT_NOTIFICATION_ID)
            prefs.edit().putInt(KEY_NEXT_NOTIFICATION_ID, nextId + 1).commit()
            nextId
        }
}
