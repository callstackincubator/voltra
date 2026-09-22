package voltra

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import voltra.ongoingnotification.AndroidOngoingNotificationPromotionIssue
import voltra.ongoingnotification.EXTRA_REQUEST_PROMOTED_ONGOING
import voltra.ongoingnotification.VoltraNotificationException

/**
 * Runs the same behavioral assertions against the real `Notification` the manager hands
 * to `NotificationManager.notify` (captured through `ShadowNotificationManager`) at two
 * platform levels: the SDK-35 class proves the pre-Live-Update behavior stays intact and
 * the SDK-36 class runs the promoted-ongoing and countdown-chip requirements. Assertions
 * that only make sense on one level use `assumeTrue(promotionSupported)` so the shared
 * list stays readable. Nothing here mocks the manager itself.
 */
abstract class VoltraNotificationManagerTestBase(
    protected val promotionSupported: Boolean,
    protected val metricStyleSupported: Boolean = false,
) {
    protected val context: Application = RuntimeEnvironment.getApplication()
    protected val notificationManager: NotificationManager by lazy {
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }
    protected val manager: VoltraNotificationManager by lazy { VoltraNotificationManager(context) }

    @Before
    fun enableNotifications() {
        shadowOf(notificationManager).setNotificationsEnabled(true)
    }

    protected fun startChannel(
        channelId: String = CHANNEL_ID,
        importance: Int = NotificationManager.IMPORTANCE_DEFAULT,
    ) {
        notificationManager.createNotificationChannel(NotificationChannel(channelId, "Voltra test channel", importance))
    }

    protected fun start(
        payload: String,
        notificationId: String? = null,
        channelId: String? = CHANNEL_ID,
        requestPromotedOngoing: Boolean? = null,
        fallbackBehavior: String? = null,
    ): AndroidOngoingNotificationStartResult =
        runBlocking {
            manager.startOngoingNotification(
                payload,
                AndroidOngoingNotificationOptions(
                    notificationId = notificationId,
                    channelId = channelId,
                    requestPromotedOngoing = requestPromotedOngoing,
                    fallbackBehavior = fallbackBehavior,
                ),
            )
        }

    protected fun postedNotifications(): List<Notification> = shadowOf(notificationManager).allNotifications

    protected fun lastPosted(): Notification =
        postedNotifications().lastOrNull() ?: throw AssertionError("Expected a posted notification")

    protected fun expectRejection(
        code: String,
        block: () -> Any?,
    ) {
        try {
            block()
            throw AssertionError("Expected a VoltraNotificationException with code $code")
        } catch (error: VoltraNotificationException) {
            assertEquals(code, error.code)
        }
    }

    /**
     * Registers an activity for the promotion settings action; a no-op in the classes
     * whose platform has no such page. `resolveActivity` matches with CATEGORY_DEFAULT
     * added to the intent, so the filter must carry it too.
     */
    protected open fun registerPromotionSettingsActivity() = Unit

    protected fun registerActivityForAction(
        action: String,
        className: String,
    ) {
        val component = ComponentName(context.packageName, className)
        val filter = IntentFilter(action).apply { addCategory(Intent.CATEGORY_DEFAULT) }
        shadowOf(context.packageManager).addActivityIfNotPresent(component)
        shadowOf(context.packageManager).addIntentFilterForActivity(component, filter)
    }

    @Test
    fun everyPostedNotificationIsOngoingNonColorizedAndWithoutCustomViews() {
        startChannel()
        val result = start(bigTextPayload(), requestPromotedOngoing = true)

        assertTrue(result.ok)
        val notification = lastPosted()
        assertTrue(notification.flags and Notification.FLAG_ONGOING_EVENT != 0)
        assertEquals(0, notification.flags and Notification.FLAG_GROUP_SUMMARY)
        assertEquals(0, notification.flags and Notification.FLAG_PROMOTED_ONGOING)
        assertFalse(notification.extras.getBoolean(Notification.EXTRA_COLORIZED, false))
        assertNull(notification.contentView)
        assertNull(notification.bigContentView)
        assertNull(notification.headsUpContentView)
    }

    @Test
    fun countdownChronometerSetsWhenAndChipExtras() {
        startChannel()

        start(progressPayload(whenMillis = PAYLOAD_WHEN_MILLIS, chronometer = true, chronometerCountDown = true))

        val notification = lastPosted()
        assertEquals(PAYLOAD_WHEN_MILLIS, notification.`when`)
        assertTrue(notification.extras.getBoolean(Notification.EXTRA_SHOW_WHEN))
        assertTrue(notification.extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER))
        assertTrue(notification.extras.getBoolean(Notification.EXTRA_CHRONOMETER_COUNT_DOWN))
    }

    @Test
    fun plainChronometerLeavesTheChipCountingUp() {
        startChannel()

        start(progressPayload(whenMillis = PAYLOAD_WHEN_MILLIS, chronometer = true))

        assertFalse(lastPosted().extras.getBoolean(Notification.EXTRA_CHRONOMETER_COUNT_DOWN))
    }

    @Test
    fun countdownWithoutWhenIsRejectedAndNothingIsPosted() {
        startChannel()

        expectRejection(VoltraNotificationException.INVALID_PAYLOAD) {
            start(progressPayload(chronometer = true, chronometerCountDown = true))
        }

        assertTrue(postedNotifications().isEmpty())
    }

    @Test
    fun startWithoutChannelIdIsRejectedWithNothingPosted() {
        expectRejection(VoltraNotificationException.CHANNEL_REQUIRED) {
            start(bigTextPayload(), channelId = null)
        }

        assertTrue(postedNotifications().isEmpty())
    }

    @Test
    fun postToUnknownChannelIsRejectedAndNeverNotified() {
        expectRejection(VoltraNotificationException.CHANNEL_NOT_FOUND) {
            start(bigTextPayload(), channelId = "voltra-channel-that-was-never-created")
        }

        assertTrue(postedNotifications().isEmpty())
    }

    @Test
    fun promotionRequestWritesTheExtrasBitEvenWithTheUserPreferenceOff() {
        assumeTrue(promotionSupported)
        startChannel()

        val result = start(bigTextPayload(), requestPromotedOngoing = true)

        // The shadow default for canPostPromotedNotifications() is false, i.e. the user
        // preference is off, and the bit must be written anyway so enabling Live Updates
        // in Settings promotes the next update without an app change.
        assertTrue(result.ok)
        assertTrue(lastPosted().extras.getBoolean(EXTRA_REQUEST_PROMOTED_ONGOING))
    }

    @Test
    fun promotionRequestIsAbsentBelowThePromotionApiLevel() {
        assumeTrue(!promotionSupported)
        startChannel()

        start(bigTextPayload(), requestPromotedOngoing = true)

        assertFalse(lastPosted().extras.containsKey(EXTRA_REQUEST_PROMOTED_ONGOING))
    }

    @Test
    fun promotionRequestIsAbsentWhenNotRequested() {
        startChannel()

        start(bigTextPayload())

        assertFalse(lastPosted().extras.containsKey(EXTRA_REQUEST_PROMOTED_ONGOING))
    }

    @Test
    fun resultCarriesPromotionReasonsForAPayloadWithoutATitle() {
        startChannel()

        val result = start(bigTextPayload(title = null), requestPromotedOngoing = true)

        val promotion = result.promotion
        assertNotNull(promotion)
        assertTrue(promotion!!.requested)
        assertTrue(promotion.reasons.contains(AndroidOngoingNotificationPromotionIssue.MISSING_TITLE))
        assertEquals(promotion.eligible, promotion.reasons.isEmpty())
        if (promotionSupported) {
            assertNotNull(promotion.hasPromotableCharacteristics)
        } else {
            assertNull(promotion.hasPromotableCharacteristics)
            assertTrue(promotion.reasons.contains(AndroidOngoingNotificationPromotionIssue.UNSUPPORTED_API_LEVEL))
        }
    }

    @Test
    fun promotionReasonsReflectThePermissionAndUserPreferenceState() {
        assumeTrue(promotionSupported)
        startChannel()

        val denied = start(bigTextPayload(), notificationId = "reasons-denied", requestPromotedOngoing = true)
        assertTrue(
            denied.promotion!!.reasons.contains(AndroidOngoingNotificationPromotionIssue.PERMISSION_NOT_DECLARED),
        )
        assertTrue(
            denied.promotion.reasons.contains(AndroidOngoingNotificationPromotionIssue.PROMOTION_DISABLED_BY_USER),
        )

        shadowOf(context).grantPermissions(PROMOTED_PERMISSION)
        val granted =
            start(
                bigTextPayload(),
                notificationId = "reasons-granted",
                requestPromotedOngoing = true,
            )
        assertFalse(
            granted.promotion!!.reasons.contains(AndroidOngoingNotificationPromotionIssue.PERMISSION_NOT_DECLARED),
        )
    }

    @Test
    fun promotionReasonIncludesNotificationsDisabled() {
        assumeTrue(promotionSupported)
        startChannel()
        shadowOf(notificationManager).setNotificationsEnabled(false)

        val result = start(bigTextPayload(), requestPromotedOngoing = true)

        assertTrue(
            result.promotion!!.reasons.contains(AndroidOngoingNotificationPromotionIssue.NOTIFICATIONS_DISABLED),
        )
    }

    @Test
    fun fallbackErrorRejectsAndWritesNothing() {
        startChannel()

        expectRejection(VoltraNotificationException.NOT_PROMOTABLE) {
            start(
                bigTextPayload(title = null),
                notificationId = "fallback-error-case",
                requestPromotedOngoing = true,
                fallbackBehavior = "error",
            )
        }

        assertTrue(postedNotifications().isEmpty())
        val status = manager.getOngoingNotificationStatus("fallback-error-case")
        assertFalse(status.isActive)
        assertFalse(status.isDismissed)
    }

    @Test
    fun fallbackErrorMessageListsTheReasons() {
        assumeTrue(promotionSupported)
        startChannel()

        try {
            start(
                bigTextPayload(title = null),
                requestPromotedOngoing = true,
                fallbackBehavior = "error",
            )
            throw AssertionError("Expected NOT_PROMOTABLE")
        } catch (error: VoltraNotificationException) {
            assertTrue(
                "Expected the message to list reasons but was: ${error.message}",
                error.message!!.contains(AndroidOngoingNotificationPromotionIssue.MISSING_TITLE),
            )
        }
    }

    @Test
    fun dismissedNotificationsAreNeverReposted() {
        startChannel()
        val startResult = start(bigTextPayload(), notificationId = "dismiss-me")
        assertTrue(startResult.ok)
        val postedBeforeDismiss = postedNotifications().size

        VoltraNotificationManager.markDismissed(context, "dismiss-me")
        val updateResult =
            runBlocking {
                manager.updateOngoingNotification("dismiss-me", bigTextPayload(text = "Gate 18 to 42"), null)
            }

        assertFalse(updateResult.ok)
        assertEquals("dismissed", updateResult.reason)
        assertEquals(postedBeforeDismiss, postedNotifications().size)
    }

    @Test
    fun promotionPreCheckMatchesPostReasonsWithoutPostingOrRecording() {
        startChannel()

        val check =
            runBlocking {
                manager.checkAndroidOngoingNotificationPromotion(
                    bigTextPayload(title = null),
                    AndroidOngoingNotificationOptions(channelId = CHANNEL_ID),
                )
            }
        assertTrue(postedNotifications().isEmpty())
        assertFalse(manager.stopOngoingNotification("promotion-check").ok)

        val post =
            start(
                bigTextPayload(title = null),
                notificationId = "compare-precheck",
                requestPromotedOngoing = true,
            )
        assertEquals(check.reasons.toSet(), post.promotion?.reasons?.toSet())
        assertEquals(check.eligible, post.promotion?.eligible)
    }

    @Test
    fun channelImportanceMinIsReportedAsAPromotionReason() {
        assumeTrue(promotionSupported)
        startChannel(importance = NotificationManager.IMPORTANCE_MIN)

        val result = start(bigTextPayload(), requestPromotedOngoing = true)

        assertTrue(
            result.promotion!!.reasons.contains(AndroidOngoingNotificationPromotionIssue.CHANNEL_IMPORTANCE_MIN),
        )
    }

    @Test
    fun statusLeavesPromotionFieldsUnknownBelowThePromotionApiLevel() {
        assumeTrue(!promotionSupported)
        startChannel()
        start(bigTextPayload(), notificationId = "status-case", requestPromotedOngoing = true)

        val status = manager.getOngoingNotificationStatus("status-case")
        assertNull(status.isPromoted)
        assertNull(status.hasPromotableCharacteristics)
    }

    @Test
    fun statusReportsBooleansOnThePromotionApiLevel() {
        assumeTrue(promotionSupported)
        startChannel()
        start(bigTextPayload(), notificationId = "status-case", requestPromotedOngoing = true)

        val status = manager.getOngoingNotificationStatus("status-case")
        assertNotNull(status.isPromoted)
        assertNotNull(status.hasPromotableCharacteristics)
    }

    @Test
    fun openAppNotificationSettingsOpensTheChannelListPage() {
        manager.openAppNotificationSettings()

        val started = shadowOf(context).nextStartedActivity
        assertEquals(Settings.ACTION_APP_NOTIFICATION_SETTINGS, started.action)
        assertEquals(context.packageName, started.getStringExtra(Settings.EXTRA_APP_PACKAGE))
    }

    @Test
    fun openPromotedNotificationSettingsFallsBackWhenNoActivityResolves() {
        // No activity is registered for the promotion action, so the guarded resolve
        // must fall back to the channel list instead of throwing ActivityNotFoundException.
        val openedPromotionPage = manager.openPromotedNotificationSettings()

        assertFalse(openedPromotionPage)
        val started = shadowOf(context).nextStartedActivity
        assertEquals(Settings.ACTION_APP_NOTIFICATION_SETTINGS, started.action)
    }

    @Test
    fun openPromotedNotificationSettingsOpensThePromotionPageWhenItResolves() {
        assumeTrue(promotionSupported)

        registerPromotionSettingsActivity()
        val openedPromotionPage = manager.openPromotedNotificationSettings()

        assertTrue(openedPromotionPage)
        val started = shadowOf(context).nextStartedActivity
        assertEquals(Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS, started.action)
        assertEquals(context.packageName, started.getStringExtra(Settings.EXTRA_APP_PACKAGE))
    }

    @Test
    fun progressPostsTheSetProgressFallbackWithNoStyleBelowTheProgressStyleApi() {
        assumeTrue(!promotionSupported)
        startChannel()

        start(progressPayload(value = 1, max = 4))

        val notification = lastPosted()
        assertEquals(1, notification.extras.getInt(Notification.EXTRA_PROGRESS))
        assertEquals(4, notification.extras.getInt(Notification.EXTRA_PROGRESS_MAX))
        assertNull(notification.extras.getString(Notification.EXTRA_TEMPLATE))
    }

    @Test
    fun progressUsesThePlatformProgressStyleOnTheProgressStyleApi() {
        assumeTrue(promotionSupported)
        startChannel()

        start(progressPayload(value = 1, max = 4))

        val notification = lastPosted()
        assertEquals(
            Notification.ProgressStyle::class.java.name,
            notification.extras.getString(Notification.EXTRA_TEMPLATE),
        )
        val recovered = Notification.Builder.recoverBuilder(context, notification).style
        assertTrue(recovered is Notification.ProgressStyle)
        assertTrue((recovered as Notification.ProgressStyle).isStyledByProgress())
    }

    @Test
    fun metricFallsBackToJoinedContentTextBelowTheMetricStyleApi() {
        assumeTrue(!metricStyleSupported)
        startChannel()

        val result = start(metricPayload())

        assertTrue(result.ok)
        assertEquals("standard", result.styleFallback)
        val notification = lastPosted()
        assertEquals(
            "Dist 5.2km, Pace 5:30, ETA 18:40",
            notification.extras.getCharSequence(Notification.EXTRA_TEXT).toString(),
        )
        assertTrue(notification.extras.getString(Notification.EXTRA_TEMPLATE)?.contains("MetricStyle") != true)
        assertEquals(Notification.CATEGORY_PROGRESS, notification.category)
    }

    @Test
    fun metricPostsThePlatformMetricStyleOnTheMetricStyleApi() {
        assumeTrue(metricStyleSupported)
        startChannel()

        val result = start(metricPayload(semanticStyle = "safe", criticalMetric = 1))

        assertTrue(result.ok)
        assertNull(result.styleFallback)
        val notification = lastPosted()
        // Pin the exact template string the platform writes for MetricStyle.
        assertEquals(
            "android.app.Notification\$MetricStyle",
            notification.extras.getString(Notification.EXTRA_TEMPLATE),
        )

        val style =
            Notification.Builder
                .recoverBuilder(context, notification)
                .style as
                Notification.MetricStyle
        assertEquals(3, style.metrics.size)
        assertEquals("Pace", style.criticalMetric?.label?.toString())
        assertEquals(Notification.SEMANTIC_STYLE_SAFE, style.metrics[0].semanticStyle)
        assertEquals(5.2f, (style.metrics[0].value as Notification.Metric.FixedFloat).value, 0.0f)
        assertEquals("km", style.metrics[0].metricUnit().toString())
    }

    private fun Notification.Metric.metricUnit(): CharSequence? =
        when (val metricValue = value) {
            is Notification.Metric.FixedInt -> metricValue.unit
            is Notification.Metric.FixedFloat -> metricValue.unit
            is Notification.Metric.FixedText -> metricValue.unit
            else -> null
        }

    @Test
    fun metricPromotionDoesNotRequireATitle() {
        assumeTrue(promotionSupported)
        startChannel()

        val result = start(metricPayload(title = null), requestPromotedOngoing = true)

        assertTrue(
            "metric payloads must not carry missing_title: " + result.promotion?.reasons,
            result.promotion?.reasons?.contains(AndroidOngoingNotificationPromotionIssue.MISSING_TITLE) != true,
        )
    }

    @Test
    fun promotionRequestIsVisibleThroughThePlatformAccessorOnApi37() {
        assumeTrue(metricStyleSupported)
        startChannel()

        start(bigTextPayload(), requestPromotedOngoing = true)

        assertTrue(lastPosted().isRequestPromotedOngoing)
    }

    @Test
    fun malformedMetricPayloadIsRejectedAndNothingIsPosted() {
        startChannel()

        expectRejection(VoltraNotificationException.INVALID_PAYLOAD) {
            start(metricPayload(metricsJson = "[{\"label\":\"WayTooLongLabel\",\"value\":1}]"))
        }

        assertTrue(postedNotifications().isEmpty())
    }

    protected companion object {
        const val CHANNEL_ID = "voltra-test-channel"
        const val PAYLOAD_WHEN_MILLIS = 1_780_000_000_000L // far future; the value is opaque to these code paths
        const val PROMOTED_PERMISSION = "android.permission.POST_PROMOTED_NOTIFICATIONS"

        fun progressPayload(
            title: String? = "Delivering order",
            value: Int = 1,
            max: Int = 2,
            whenMillis: Long? = null,
            chronometer: Boolean? = null,
            chronometerCountDown: Boolean? = null,
        ): String {
            val fields = mutableListOf("\"v\":1", "\"kind\":\"progress\"", "\"value\":$value", "\"max\":$max")
            title?.let { fields += "\"title\":\"$it\"" }
            whenMillis?.let { fields += "\"when\":$it" }
            chronometer?.let { fields += "\"chronometer\":$it" }
            chronometerCountDown?.let { fields += "\"chronometerCountDown\":$it" }
            return "{${fields.joinToString(",")}}"
        }

        fun metricPayload(
            title: String? = "Workout",
            metricsJson: String =
                "[{\"label\":\"Dist\",\"value\":{\"type\":\"float\",\"value\":5.2," +
                    "\"unit\":\"km\",\"fractionDigits\":1}}," +
                    "{\"label\":\"Pace\",\"value\":{\"type\":\"text\",\"value\":\"5:30\"}}," +
                    "{\"label\":\"ETA\",\"value\":{\"type\":\"time\",\"value\":\"18:40\"}}]",
            criticalMetric: Int? = null,
            semanticStyle: String? = null,
        ): String {
            val fields =
                mutableListOf(
                    "\"v\":1",
                    "\"kind\":\"metric\"",
                    "\"metrics\":$metricsJson",
                )
            title?.let { fields += "\"title\":\"$it\"" }
            criticalMetric?.let { fields += "\"criticalMetric\":$it" }
            semanticStyle?.let { fields += "\"semanticStyle\":\"$it\"" }
            return "{${fields.joinToString(",")}}"
        }

        fun bigTextPayload(
            title: String? = "Gate change",
            text: String = "Gate 42 to 18",
        ): String {
            val fields = mutableListOf("\"v\":1", "\"kind\":\"bigText\"", "\"text\":\"$text\"")
            title?.let { fields += "\"title\":\"$it\"" }
            return "{${fields.joinToString(",")}}"
        }
    }
}
