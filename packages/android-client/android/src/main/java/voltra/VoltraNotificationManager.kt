package voltra

import android.app.Notification
import android.app.Notification.BigTextStyle
import android.app.Notification.Builder
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.compose.ui.graphics.toArgb
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import voltra.images.VoltraImageManager
import voltra.ongoingnotification.AndroidOngoingNotificationActionPayload
import voltra.ongoingnotification.AndroidOngoingNotificationBigTextPayload
import voltra.ongoingnotification.AndroidOngoingNotificationImageSource
import voltra.ongoingnotification.AndroidOngoingNotificationMetricPayload
import voltra.ongoingnotification.AndroidOngoingNotificationPayload
import voltra.ongoingnotification.AndroidOngoingNotificationPayloadParser
import voltra.ongoingnotification.AndroidOngoingNotificationProgressPayload
import voltra.ongoingnotification.AndroidOngoingNotificationProgressPointPayload
import voltra.ongoingnotification.AndroidOngoingNotificationProgressSegmentPayload
import voltra.ongoingnotification.AndroidOngoingNotificationPromotionEvaluator
import voltra.ongoingnotification.AndroidOngoingNotificationPromotionInfo
import voltra.ongoingnotification.AndroidOngoingNotificationRecord
import voltra.ongoingnotification.EXTRA_REQUEST_PROMOTED_ONGOING
import voltra.ongoingnotification.METRIC_STYLE_MIN_SDK
import voltra.ongoingnotification.PROMOTION_MIN_SDK
import voltra.ongoingnotification.VoltraNotificationException
import voltra.ongoingnotification.buildMetricStyle
import voltra.ongoingnotification.hasPromotedNotificationsPermission
import voltra.ongoingnotification.renderMetricFallbackText
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
    val promotion: AndroidOngoingNotificationPromotionInfo? = null,
    val styleFallback: String? = null,
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
        private const val PROMOTION_CHECK_NOTIFICATION_ID = "promotion-check"

        // Never allocated to a real notification (the allocator starts at 10000), so the
        // throwaway notification built by the promotion pre-flight cannot share its
        // PendingIntent request codes with a real one.
        private const val PROMOTION_CHECK_SYSTEM_NOTIFICATION_ID = -1
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
    private val promotionEvaluator = AndroidOngoingNotificationPromotionEvaluator(appContext, notificationManager)
    private val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val lock = Any()

    suspend fun startOngoingNotification(
        payload: String,
        options: AndroidOngoingNotificationOptions,
    ): AndroidOngoingNotificationStartResult =
        withContext(Dispatchers.Default) {
            val parsedPayload = AndroidOngoingNotificationPayloadParser.parseValidated(payload)
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

            val promotion = postNotification(record, parsedPayload, onlyAlertOnce = false)
            saveRecord(record)
            AndroidOngoingNotificationStartResult(
                ok = true,
                notificationId = notificationId,
                action = "started",
                promotion = promotion,
                styleFallback = resolveStyleFallback(parsedPayload),
            )
        }

    suspend fun updateOngoingNotification(
        notificationId: String,
        payload: String,
        options: AndroidOngoingNotificationOptions?,
    ): AndroidOngoingNotificationUpdateResult =
        withContext(Dispatchers.Default) {
            val parsedPayload = AndroidOngoingNotificationPayloadParser.parseValidated(payload)
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

            val promotion = postNotification(record, parsedPayload, onlyAlertOnce = true)
            saveRecord(record)
            AndroidOngoingNotificationUpdateResult(
                ok = true,
                notificationId = notificationId,
                action = "updated",
                promotion = promotion,
                styleFallback = resolveStyleFallback(parsedPayload),
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
                )
            }

            val updateResult = updateOngoingNotification(notificationId, payload, options.copy(notificationId = null))
            AndroidOngoingNotificationUpsertResult(
                ok = updateResult.ok,
                notificationId = notificationId,
                action = if (updateResult.ok) "updated" else null,
                reason = updateResult.reason,
                promotion = updateResult.promotion,
                styleFallback = updateResult.styleFallback,
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
        val supportsPromoted = Build.VERSION.SDK_INT >= PROMOTION_MIN_SDK
        val canPostPromoted =
            supportsPromoted &&
                notificationsEnabled &&
                notificationManager.canPostPromotedNotifications() &&
                hasPromotedNotificationsPermission(appContext)

        return AndroidOngoingNotificationCapabilities(
            apiLevel = Build.VERSION.SDK_INT,
            notificationsEnabled = notificationsEnabled,
            supportsPromotedNotifications = supportsPromoted,
            canPostPromotedNotifications = canPostPromoted,
            canRequestPromotedOngoing = canPostPromoted,
        )
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

    private fun postNotification(
        record: AndroidOngoingNotificationRecord,
        payload: AndroidOngoingNotificationPayload,
        onlyAlertOnce: Boolean,
    ): AndroidOngoingNotificationPromotionInfo? {
        ensureChannelExists(record.channelId)

        val notification = buildNotification(record, payload, onlyAlertOnce)
        // Evaluates before notify(): with fallbackBehavior 'error' an ineligible
        // notification must leave nothing posted and no record written.
        val promotion = evaluatePromotion(record, payload, notification)

        notificationManager.notify(record.systemNotificationId, notification)
        return promotion
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

        getNotificationCategory(payload)?.let { builder.setCategory(it) }

        payload.title?.let { builder.setContentTitle(it) }

        applyCommonFields(builder, payload)
        applyPayloadStyle(builder, payload)
        applyActions(builder, record, payload)
        requestPromotionIfPossible(builder, record)

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

        if (payload.whenEpochMillis != null || payload.chronometer == true) {
            builder.setWhen(payload.whenEpochMillis ?: System.currentTimeMillis())
            builder.setShowWhen(true)
            // Remote payloads bypass the renderer (which always pairs the two flags), so
            // a countdown may arrive without `chronometer: true`. A countdown chip is
            // still a chip: show the chronometer rather than a static timestamp.
            builder.setUsesChronometer(payload.chronometer == true || payload.chronometerCountDown == true)
            // Validation guarantees a countdown always has `when` to count down to.
            // setChronometerCountDown is API 24 — Voltra's minSdk — so no gate is needed.
            if (payload.chronometerCountDown == true) {
                builder.setChronometerCountDown(true)
            }
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

            is AndroidOngoingNotificationMetricPayload -> {
                if (Build.VERSION.SDK_INT >= METRIC_STYLE_MIN_SDK) {
                    builder.setStyle(buildMetricStyle(payload))
                } else {
                    builder.setContentText(renderMetricFallbackText(payload))
                }
            }
        }
    }

    private fun getNotificationCategory(payload: AndroidOngoingNotificationPayload): String? =
        when (payload) {
            // Metrics double as live-update material, which requires a progress (or call)
            // category for promotable characteristics.
            is AndroidOngoingNotificationProgressPayload -> Notification.CATEGORY_PROGRESS

            is AndroidOngoingNotificationMetricPayload -> Notification.CATEGORY_PROGRESS

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

    @RequiresApi(36)
    private fun AndroidOngoingNotificationProgressSegmentPayload.toNativeSegment(): Notification.ProgressStyle.Segment {
        val segment = Notification.ProgressStyle.Segment(length)
        parseAndroidColor(color)?.let { segment.setColor(it) }
        return segment
    }

    @RequiresApi(36)
    private fun AndroidOngoingNotificationProgressPointPayload.toNativePoint(): Notification.ProgressStyle.Point {
        val point = Notification.ProgressStyle.Point(position)
        parseAndroidColor(color)?.let { point.setColor(it) }
        return point
    }

    private fun parseAndroidColor(color: String?): Int? {
        val value = JSColorParser.parse(color) as? VoltraColorValue.Static ?: return null
        return value.color.toArgb()
    }

    // Metrics have a real presentation only from API 37; below that the post succeeds as a
    // standard notification whose contentText lists the readings, and the result says so.
    private fun resolveStyleFallback(payload: AndroidOngoingNotificationPayload): String? =
        if (payload is AndroidOngoingNotificationMetricPayload && Build.VERSION.SDK_INT < METRIC_STYLE_MIN_SDK) {
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
