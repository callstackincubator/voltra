package voltra

import android.app.Notification
import android.app.Notification.BigTextStyle
import android.app.Notification.Builder
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.compose.ui.graphics.toArgb
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import voltra.images.VoltraImageManager
import voltra.ongoingnotification.AndroidOngoingNotificationActionPayload
import voltra.ongoingnotification.AndroidOngoingNotificationBigTextPayload
import voltra.ongoingnotification.AndroidOngoingNotificationImageSource
import voltra.ongoingnotification.AndroidOngoingNotificationPayload
import voltra.ongoingnotification.AndroidOngoingNotificationPayloadParser
import voltra.ongoingnotification.AndroidOngoingNotificationProgressPayload
import voltra.ongoingnotification.AndroidOngoingNotificationProgressPointPayload
import voltra.ongoingnotification.AndroidOngoingNotificationProgressSegmentPayload
import voltra.ongoingnotification.AndroidOngoingNotificationRecord
import voltra.styling.JSColorParser
import voltra.styling.VoltraColorValue

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
)

data class AndroidOngoingNotificationCapabilities(
    val apiLevel: Int,
    val notificationsEnabled: Boolean,
    val supportsPromotedNotifications: Boolean,
    val canPostPromotedNotifications: Boolean,
    val canRequestPromotedOngoing: Boolean,
)

data class AndroidOngoingNotificationStatus(
    val isActive: Boolean,
    val isDismissed: Boolean,
    val isPromoted: Boolean? = null,
    val hasPromotableCharacteristics: Boolean? = null,
)

data class AndroidOngoingNotificationStartResult(
    val ok: Boolean,
    val notificationId: String,
    val action: String? = null,
    val reason: String? = null,
)

data class AndroidOngoingNotificationUpdateResult(
    val ok: Boolean,
    val notificationId: String,
    val action: String? = null,
    val reason: String? = null,
)

data class AndroidOngoingNotificationUpsertResult(
    val ok: Boolean,
    val notificationId: String,
    val action: String? = null,
    val reason: String? = null,
)

data class AndroidOngoingNotificationStopResult(
    val ok: Boolean,
    val notificationId: String,
    val action: String? = null,
    val reason: String? = null,
)

class VoltraNotificationManager(
    context: Context,
) {
    companion object {
        private const val TAG = "VoltraNotificationMgr"
        private const val PREFS_NAME = "voltra_ongoing_notifications"
        private const val KEY_RECORDS = "records"
        private const val KEY_NEXT_NOTIFICATION_ID = "next_notification_id"
        private const val DEFAULT_NOTIFICATION_ID = 10000
        private const val PROMOTED_PERMISSION = "android.permission.POST_PROMOTED_NOTIFICATIONS"
        private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"
        const val EXTRA_NOTIFICATION_ID = "voltra.extra.NOTIFICATION_ID"

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
            val records = readRecords(prefs).toMutableMap()
            val record = records[notificationId] ?: return

            records[notificationId] =
                record.copy(
                    active = false,
                    dismissed = true,
                )
            writeRecords(prefs, records)
            Log.d(TAG, "Marked ongoing notification as dismissed: $notificationId")
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
    private val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val lock = Any()

    suspend fun startOngoingNotification(
        payload: String,
        options: AndroidOngoingNotificationOptions,
    ): AndroidOngoingNotificationStartResult =
        withContext(Dispatchers.Default) {
            val notificationId = options.notificationId ?: createGeneratedNotificationId()
            val existingRecord = getRecord(notificationId)
            if (existingRecord != null) {
                return@withContext AndroidOngoingNotificationStartResult(
                    ok = false,
                    notificationId = notificationId,
                    reason = "already_exists",
                )
            }
            val record =
                createMergedRecord(
                    notificationId = notificationId,
                    currentRecord = existingRecord,
                    options = options,
                    allowMissingChannel = false,
                ).copy(
                    active = true,
                    dismissed = false,
                )

            postNotification(
                record,
                AndroidOngoingNotificationPayloadParser.parse(payload),
                onlyAlertOnce = existingRecord != null,
            )
            saveRecord(record)
            AndroidOngoingNotificationStartResult(
                ok = true,
                notificationId = notificationId,
                action = "started",
            )
        }

    suspend fun updateOngoingNotification(
        notificationId: String,
        payload: String,
        options: AndroidOngoingNotificationOptions?,
    ): AndroidOngoingNotificationUpdateResult =
        withContext(Dispatchers.Default) {
            val currentRecord =
                getRecord(notificationId)
                    ?: return@withContext AndroidOngoingNotificationUpdateResult(
                        ok = false,
                        notificationId = notificationId,
                        reason = "not_found",
                    )
            if (currentRecord.dismissed) {
                Log.d(TAG, "Rejected dismissed ongoing notification $notificationId")
                return@withContext AndroidOngoingNotificationUpdateResult(
                    ok = false,
                    notificationId = notificationId,
                    reason = "dismissed",
                )
            }

            val record =
                createMergedRecord(
                    notificationId = notificationId,
                    currentRecord = currentRecord,
                    options = options ?: AndroidOngoingNotificationOptions(),
                    allowMissingChannel = currentRecord != null,
                ).copy(
                    active = true,
                    dismissed = false,
                )

            postNotification(record, AndroidOngoingNotificationPayloadParser.parse(payload), onlyAlertOnce = true)
            saveRecord(record)
            AndroidOngoingNotificationUpdateResult(
                ok = true,
                notificationId = notificationId,
                action = "updated",
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
                )
            }

            val updateResult = updateOngoingNotification(notificationId, payload, options.copy(notificationId = null))
            AndroidOngoingNotificationUpsertResult(
                ok = updateResult.ok,
                notificationId = notificationId,
                action = if (updateResult.ok) "updated" else null,
                reason = updateResult.reason,
            )
        }

    fun stopOngoingNotification(notificationId: String): AndroidOngoingNotificationStopResult {
        val record =
            getRecord(notificationId)
                ?: return AndroidOngoingNotificationStopResult(
                    ok = false,
                    notificationId = notificationId,
                    reason = "not_found",
                )
        notificationManager.cancel(record.systemNotificationId)
        removeRecord(notificationId)
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
        )
    }

    fun endAllOngoingNotifications() {
        val records = getRecords()
        records.values.forEach { record ->
            notificationManager.cancel(record.systemNotificationId)
        }
        clearRecords()
    }

    fun canPostPromotedAndroidNotifications(): Boolean =
        getOngoingNotificationCapabilities().canPostPromotedNotifications

    fun getOngoingNotificationCapabilities(): AndroidOngoingNotificationCapabilities {
        val notificationsEnabled = notificationManager.areNotificationsEnabled()
        val supportsPromoted = Build.VERSION.SDK_INT >= 36
        val canPostPromoted =
            supportsPromoted &&
                notificationsEnabled &&
                notificationManager.canPostPromotedNotifications() &&
                hasPromotedNotificationsPermission()

        return AndroidOngoingNotificationCapabilities(
            apiLevel = Build.VERSION.SDK_INT,
            notificationsEnabled = notificationsEnabled,
            supportsPromotedNotifications = supportsPromoted,
            canPostPromotedNotifications = canPostPromoted,
            canRequestPromotedOngoing = canPostPromoted,
        )
    }

    fun openPromotedNotificationSettings() {
        val intent =
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, appContext.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        appContext.startActivity(intent)
    }

    private fun createGeneratedNotificationId(): String {
        val intId = allocateNotificationId()
        return "ongoing-notification-$intId"
    }

    private fun postNotification(
        record: AndroidOngoingNotificationRecord,
        payload: AndroidOngoingNotificationPayload,
        onlyAlertOnce: Boolean,
    ) {
        if (record.requestPromotedOngoing &&
            resolveFallbackBehavior(record.fallbackBehavior) == AndroidOngoingNotificationFallbackBehavior.ERROR
        ) {
            val capabilities = getOngoingNotificationCapabilities()
            if (!capabilities.canRequestPromotedOngoing) {
                throw IllegalStateException(
                    "Promoted ongoing notifications are unavailable on this device/app configuration.",
                )
            }
        }

        val builder =
            Builder(appContext, record.channelId)
                .setSmallIcon(resolveSmallIcon(record.smallIcon))
                .setOngoing(true)
                .setOnlyAlertOnce(onlyAlertOnce)
                .setDeleteIntent(createDeleteIntent(record))
                .setContentIntent(createContentIntent(record))

        getNotificationCategory(payload)?.let { builder.setCategory(it) }

        payload.title?.let { builder.setContentTitle(it) }

        applyCommonFields(builder, payload)
        applyPayloadStyle(builder, payload)
        applyActions(builder, record, payload)
        requestPromotionIfPossible(builder, record)

        notificationManager.notify(record.systemNotificationId, builder.build())
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
        }

        payload.subText?.let { builder.setSubText(it) }

        resolveNotificationIcon(payload.largeIcon)?.let { builder.setLargeIcon(it) }

        if (Build.VERSION.SDK_INT >= 36) {
            payload.shortCriticalText?.let { builder.setShortCriticalText(it) }
        }

        if (payload.whenEpochMillis != null || payload.chronometer == true) {
            builder.setWhen(payload.whenEpochMillis ?: System.currentTimeMillis())
            builder.setShowWhen(true)
            builder.setUsesChronometer(payload.chronometer == true)
        } else {
            builder.setShowWhen(false)
        }
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
        }
    }

    private fun getNotificationCategory(payload: AndroidOngoingNotificationPayload): String? =
        when (payload) {
            is AndroidOngoingNotificationProgressPayload -> Notification.CATEGORY_PROGRESS
            is AndroidOngoingNotificationBigTextPayload -> null
        }

    private fun resolveNotificationIcon(source: AndroidOngoingNotificationImageSource?): Icon? {
        if (source == null) return null

        source.assetName?.takeIf { it.isNotBlank() }?.let { assetName ->
            val resId = appContext.resources.getIdentifier(assetName, "drawable", appContext.packageName)
            if (resId != 0) {
                return Icon.createWithResource(appContext, resId)
            }

            val imageManager = VoltraImageManager(appContext)
            val uriString = imageManager.getUriForKey(assetName)
            if (uriString != null) {
                try {
                    val uri = Uri.parse(uriString)
                    appContext.contentResolver.openInputStream(uri)?.use { stream ->
                        val bitmap = BitmapFactory.decodeStream(stream)
                        if (bitmap != null) {
                            return Icon.createWithBitmap(bitmap)
                        }
                    }
                } catch (error: Exception) {
                    Log.e(TAG, "Failed to decode notification icon asset: $assetName", error)
                }
            }
        }

        source.base64?.takeIf { it.isNotBlank() }?.let { base64 ->
            try {
                val decoded = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
                val bitmap = BitmapFactory.decodeByteArray(decoded, 0, decoded.size)
                if (bitmap != null) {
                    return Icon.createWithBitmap(bitmap)
                }
            } catch (error: Exception) {
                Log.e(TAG, "Failed to decode notification base64 icon", error)
            }
        }

        return null
    }

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

    private fun AndroidOngoingNotificationProgressSegmentPayload.toNativeSegment(): Notification.ProgressStyle.Segment {
        val segment = Notification.ProgressStyle.Segment(length)
        parseAndroidColor(color)?.let { segment.setColor(it) }
        return segment
    }

    private fun AndroidOngoingNotificationProgressPointPayload.toNativePoint(): Notification.ProgressStyle.Point {
        val point = Notification.ProgressStyle.Point(position)
        parseAndroidColor(color)?.let { point.setColor(it) }
        return point
    }

    private fun parseAndroidColor(color: String?): Int? {
        val value = JSColorParser.parse(color) as? VoltraColorValue.Static ?: return null
        return value.color.toArgb()
    }

    private fun requestPromotionIfPossible(
        builder: Builder,
        record: AndroidOngoingNotificationRecord,
    ) {
        if (!record.requestPromotedOngoing || !getOngoingNotificationCapabilities().canRequestPromotedOngoing) {
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

    private fun hasPromotedNotificationsPermission(): Boolean {
        if (Build.VERSION.SDK_INT < 36) {
            return false
        }

        return try {
            appContext.checkSelfPermission(PROMOTED_PERMISSION) == PackageManager.PERMISSION_GRANTED
        } catch (_: Throwable) {
            true
        }
    }

    private fun createMergedRecord(
        notificationId: String,
        currentRecord: AndroidOngoingNotificationRecord?,
        options: AndroidOngoingNotificationOptions,
        allowMissingChannel: Boolean,
    ): AndroidOngoingNotificationRecord {
        val channelId = options.channelId ?: currentRecord?.channelId
        if (channelId.isNullOrBlank() && !allowMissingChannel) {
            throw IllegalArgumentException("channelId is required for Android ongoing notifications.")
        }

        val systemNotificationId = currentRecord?.systemNotificationId ?: allocateNotificationId()

        return AndroidOngoingNotificationRecord(
            notificationId = notificationId,
            systemNotificationId = systemNotificationId,
            channelId =
                channelId ?: throw IllegalArgumentException("channelId is required for Android ongoing notifications."),
            smallIcon = options.smallIcon ?: currentRecord?.smallIcon,
            deepLinkUrl = options.deepLinkUrl ?: currentRecord?.deepLinkUrl,
            requestPromotedOngoing =
                if (options.requestPromotedOngoing != null) {
                    options.requestPromotedOngoing
                } else {
                    currentRecord?.requestPromotedOngoing ?: false
                },
            fallbackBehavior = options.fallbackBehavior ?: currentRecord?.fallbackBehavior ?: "standard",
            active = currentRecord?.active ?: true,
            dismissed = currentRecord?.dismissed ?: false,
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
