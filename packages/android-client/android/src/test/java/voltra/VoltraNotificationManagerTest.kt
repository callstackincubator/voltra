package voltra

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import voltra.ongoingnotification.AndroidOngoingNotificationOption
import voltra.ongoingnotification.AndroidOngoingNotificationPresentationUpdate
import voltra.ongoingnotification.AndroidOngoingNotificationRecord

/**
 * Covers what the platform `Notification` looks like after Voltra builds it, which is the only place
 * the presentation options become observable.
 *
 * Nothing is mocked: the manager runs against Robolectric's real `Notification.Builder` and real
 * `SharedPreferences`, and the assertions read the notification its `NotificationManager` shadow
 * captured. The API level is pinned per test wherever the code itself branches on it.
 */
@RunWith(RobolectricTestRunner::class)
class VoltraNotificationManagerTest {
    private lateinit var context: Context
    private lateinit var notificationManager: NotificationManager
    private lateinit var manager: VoltraNotificationManager

    private var phase = 0

    @Before
    fun setUp() {
        context = RuntimeEnvironment.getApplication()
        notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Notification.Builder rejects a small icon resource id of 0, which is what this library's
        // own test application reports, so give it the fallback an installed app already has.
        context.applicationInfo.icon = android.R.drawable.sym_call_incoming

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Voltra tests", NotificationManager.IMPORTANCE_DEFAULT),
            )
        }

        manager = VoltraNotificationManager(context)
    }

    @Test
    fun visibilityOptionSetsTheLockScreenVisibility() {
        assertEquals(Notification.VISIBILITY_PUBLIC, startWith(visibility = "public").visibility)
        assertEquals(Notification.VISIBILITY_PRIVATE, startWith(visibility = "private").visibility)
        assertEquals(Notification.VISIBILITY_SECRET, startWith(visibility = "secret").visibility)
    }

    @Test
    fun visibilityStaysAtThePlatformDefaultWhenUnset() {
        assertEquals(Notification.VISIBILITY_PRIVATE, startWith().visibility)
    }

    @Test
    fun publicVersionBecomesTheLockScreenCopyOfTheNotification() {
        val notification = startWith(payload = progressPayload(PUBLIC_VERSION_FIELDS), color = "#1E88E5")
        val publicVersion = requireNotNull(notification.publicVersion)
        val publicExtras = requireNotNull(publicVersion.extras)

        assertEquals("Ride in progress", publicExtras.getCharSequence(Notification.EXTRA_TITLE).toString())
        assertEquals("Unlock to see driver details", publicExtras.getCharSequence(Notification.EXTRA_TEXT).toString())
        assertEquals(Notification.VISIBILITY_PUBLIC, publicVersion.visibility)
        assertTrue(publicVersion.flags and Notification.FLAG_ONGOING_EVENT != 0)
        // Icons are not value-equal across instances, so compare the resource id they carry.
        assertEquals(notification.smallIcon!!.resId, publicVersion.smallIcon!!.resId)
        assertEquals(notification.color, publicVersion.color)
        assertEquals(notification.category, publicVersion.category)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            assertEquals(notification.channelId, publicVersion.channelId)
        }

        // The copy says only that something is happening: no progress, no actions.
        assertFalse(publicExtras.containsKey(Notification.EXTRA_PROGRESS_MAX))
        assertTrue(publicVersion.actions == null || publicVersion.actions.isEmpty())
    }

    @Test
    fun payloadWithoutAPublicVersionPostsNone() {
        assertNull(startWith().publicVersion)
    }

    /**
     * The public version is the one place Voltra builds a second `Notification.Builder`, and on this
     * release range that goes down the deprecated `Builder(Context)` constructor, so the whole path
     * has to run here rather than only be argued about.
     */
    @Test
    @Config(sdk = [24])
    fun thePublicVersionIsBuiltTheSameWayOnTheOldestSupportedRelease() {
        val notification = startWith(payload = progressPayload(PUBLIC_VERSION_FIELDS), color = "#1E88E5")
        val publicVersion = requireNotNull(notification.publicVersion)
        val publicExtras = requireNotNull(publicVersion.extras)

        assertEquals("Ride in progress", publicExtras.getCharSequence(Notification.EXTRA_TITLE).toString())
        assertEquals("Unlock to see driver details", publicExtras.getCharSequence(Notification.EXTRA_TEXT).toString())
        assertEquals(Notification.VISIBILITY_PUBLIC, publicVersion.visibility)
        assertEquals(notification.smallIcon!!.resId, publicVersion.smallIcon!!.resId)
        assertEquals(notification.color, publicVersion.color)
    }

    @Test
    fun colorOptionSetsTheAccentColorFromAnyStaticColorString() {
        assertEquals(0xFF1E88E5.toInt(), startWith(color = "#1E88E5").color)
        assertEquals(0xFF1E88E5.toInt(), startWith(color = "rgb(30, 136, 229)").color)
    }

    @Test
    fun anUnresolvableColorIsRejectedByNameAndPostsNothing() {
        // "~p" is a dynamic theme color token: only the app's theme can resolve it, and a
        // notification cannot carry one, so this has to fail the call rather than post without color.
        val error =
            assertThrows(IllegalArgumentException::class.java) {
                runBlocking { manager.startOngoingNotification(progressPayload(), optionsWith(color = "~p")) }
            }

        assertTrue(error.message!!.contains("color"))
        assertEquals(0, shadowOf(notificationManager).allNotifications.size)
    }

    @Test
    fun categoryOptionOverridesTheCategoryDerivedFromThePayloadKind() {
        assertEquals("navigation", startWith(category = "navigation").category)
    }

    @Test
    fun categoryFallsBackToThePayloadKind() {
        assertEquals("progress", startWith().category)
        assertNull(startBigTextWithCategory())
    }

    @Test
    fun aCategoryVoltraDoesNotSupportIsNotApplied() {
        assertEquals("progress", startWith(category = "call").category)
    }

    @Test
    @Config(sdk = [24])
    fun newCategoryValuesAreWrittenAsLiteralsOnTheOldestSupportedRelease() {
        assertEquals("navigation", startWith(category = "navigation").category)
        assertEquals("workout", startWith(category = "workout").category)
    }

    @Test
    @Config(sdk = [28])
    fun theNavigationCategoryIsAppliedOnApi28() {
        assertEquals("navigation", startWith(category = "navigation").category)
    }

    @Test
    @Config(sdk = [31])
    fun theWorkoutCategoryIsAppliedOnApi31() {
        assertEquals("workout", startWith(category = "workout").category)
    }

    @Test
    @Config(sdk = [26])
    fun timeoutOptionAppliesTheSystemTimeoutOnEveryPost() {
        assertEquals(1800000L, startWith(timeoutMs = 1800000L).getTimeoutAfter())

        // An update that does not mention the timeout keeps it, and posts it again, so the timer
        // restarts instead of the notification being timed out mid-update.
        assertEquals(1800000L, updateLatest(AndroidOngoingNotificationOptions()).getTimeoutAfter())
    }

    @Test
    @Config(sdk = [24])
    fun timeoutOptionIsStoredButNotAppliedBelowApi26() {
        assertNotNull(startWith(timeoutMs = 1800000L))
        assertEquals(1800000L, requireNotNull(storedRecord()).presentation.timeoutMs)
    }

    @Test
    fun aNotificationThatIsNoLongerPostedReportsInactive() {
        val started = runBlocking { manager.startOngoingNotification(progressPayload(), optionsWith()) }
        assertTrue(started.ok)
        assertTrue(manager.getOngoingNotificationStatus(started.notificationId).isActive)

        // Robolectric cannot run the system's timeout, so the tray is emptied the way the system
        // would: what an app needs to see either way is that the notification reads as gone.
        notificationManager.cancelAll()
        assertFalse(manager.getOngoingNotificationStatus(started.notificationId).isActive)
    }

    @Test
    fun localOnlyOptionKeepsTheNotificationOnTheDevice() {
        assertTrue(startWith(localOnly = true).flags and Notification.FLAG_LOCAL_ONLY != 0)
        assertTrue(startWith(localOnly = false).flags and Notification.FLAG_LOCAL_ONLY == 0)
        assertTrue(startWith().flags and Notification.FLAG_LOCAL_ONLY == 0)
    }

    @Test
    fun groupAndSortKeyOptionsOrderTheNotificationInItsGroup() {
        val notification = startWith(group = "rides", sortKey = "2026-09-22T12:00")

        assertEquals("rides", notification.group)
        assertEquals("2026-09-22T12:00", notification.sortKey)
    }

    /**
     * The same options at once, read back on the two oldest releases Voltra supports: they all sit on
     * setters far below `minSdk`, and this is what turns that argument into a regression test.
     */
    @Test
    @Config(sdk = [24, 25])
    fun everyPresentationOptionIsAppliedOnTheOldestSupportedReleases() {
        val notification =
            startWith(
                visibility = "private",
                color = "#1E88E5",
                localOnly = true,
                group = "rides",
                sortKey = "2026-09-22T12:00",
            )

        assertEquals(Notification.VISIBILITY_PRIVATE, notification.visibility)
        assertEquals(0xFF1E88E5.toInt(), notification.color)
        assertTrue(notification.flags and Notification.FLAG_LOCAL_ONLY != 0)
        assertEquals("rides", notification.group)
        assertEquals("2026-09-22T12:00", notification.sortKey)
    }

    @Test
    fun anUpdateKeepsStoredOptionsReplacesThemAndClearsThem() {
        val started =
            runBlocking {
                manager.startOngoingNotification(
                    progressPayload(),
                    optionsWith(visibility = "private", color = "#1E88E5", timeoutMs = 60000L),
                )
            }
        val notificationId = started.notificationId

        // No options at all: everything from the start post survives.
        var posted = updateOn(notificationId, AndroidOngoingNotificationOptions())
        assertEquals(Notification.VISIBILITY_PRIVATE, posted.visibility)
        assertEquals(0xFF1E88E5.toInt(), posted.color)
        assertEquals(60000L, posted.getTimeoutAfter())

        // One option cleared by name: only that one falls back to the platform default.
        posted =
            updateOn(
                notificationId,
                AndroidOngoingNotificationOptions(
                    presentation = AndroidOngoingNotificationPresentationUpdate(color = cleared()),
                ),
            )
        assertEquals(0, posted.color)
        assertEquals(Notification.VISIBILITY_PRIVATE, posted.visibility)
        assertEquals(60000L, posted.getTimeoutAfter())

        // One option replaced: the new value is stored, not only applied to this post.
        posted = updateOn(notificationId, optionsWith(color = "#000000"))
        assertEquals(0xFF000000.toInt(), posted.color)
        posted = updateOn(notificationId, AndroidOngoingNotificationOptions())
        assertEquals(0xFF000000.toInt(), posted.color)
        // The record keeps the color as the string the app chose, the same way it keeps an icon name.
        assertEquals("#000000", requireNotNull(storedRecord(notificationId)).presentation.color)
    }

    @Test
    fun upsertStoresOptionsWhenStartingAndMergesThemWhenUpdating() {
        val started =
            runBlocking { manager.upsertOngoingNotification(progressPayload(), optionsWith(color = "#1E88E5")) }
        assertEquals("started", started.action)
        assertEquals(0xFF1E88E5.toInt(), lastPosted().color)

        val updated =
            runBlocking {
                manager.upsertOngoingNotification(
                    progressPayload(),
                    AndroidOngoingNotificationOptions(
                        notificationId = started.notificationId,
                        presentation = AndroidOngoingNotificationPresentationUpdate(color = cleared()),
                        alert = true,
                    ),
                )
            }
        assertEquals("updated", updated.action)

        val posted = lastPosted()
        assertEquals(0, posted.color)
        assertTrue(posted.flags and Notification.FLAG_ONLY_ALERT_ONCE == 0)
    }

    @Test
    fun aStartPostAlertsAndUpdatePostsAreSilent() {
        val started = runBlocking { manager.startOngoingNotification(progressPayload(), optionsWith()) }
        assertTrue(lastPosted().flags and Notification.FLAG_ONLY_ALERT_ONCE == 0)

        updateOn(started.notificationId, AndroidOngoingNotificationOptions())
        assertTrue(lastPosted().flags and Notification.FLAG_ONLY_ALERT_ONCE != 0)
    }

    @Test
    fun alertOptionMakesOneUpdatePostAlertAndTheNextOneIsSilentAgain() {
        val started = runBlocking { manager.startOngoingNotification(progressPayload(), optionsWith()) }

        updateOn(started.notificationId, optionsWith(alert = true))
        assertTrue(lastPosted().flags and Notification.FLAG_ONLY_ALERT_ONCE == 0)

        updateOn(started.notificationId, AndroidOngoingNotificationOptions())
        assertTrue(lastPosted().flags and Notification.FLAG_ONLY_ALERT_ONCE != 0)
    }

    @Test
    fun noPostUsesAFieldThisIssueRejects() {
        val notification = startWith(color = "#1E88E5", group = "rides")

        assertEquals(0, notification.flags and Notification.FLAG_AUTO_CANCEL)
        assertEquals(0, notification.flags and Notification.FLAG_GROUP_SUMMARY)
        assertEquals(0, notification.number)
        assertFalse(notification.extras.getBoolean(Notification.EXTRA_COLORIZED, false))
        assertEquals(Notification.BADGE_ICON_NONE, notification.badgeIconType)
        assertEquals(0L, notification.timeoutAfter)
        assertNull(notification.extras.getCharSequence(Notification.EXTRA_INFO_TEXT))
        // Notification.setSettingsText has no public extra key to name, so this is the key it writes.
        assertFalse(notification.extras.containsKey("android.settingsText"))
        // Sound, vibration, lights and defaults all moved to the channel in API 26, and none of
        // them is something Voltra sets. Sound and vibration are only reachable as fields the
        // public SDK stopped naming, so reflection reads them; whatever `Notification.Builder`
        // puts on its own (the default audio attributes) stays as delivered.
        assertNull(ReflectionHelpers.getField<Any?>(notification, "sound"))
        assertNull(ReflectionHelpers.getField<LongArray?>(notification, "vibrate"))
        assertEquals(0, notification.ledARGB)
        assertEquals(0, notification.defaults and Notification.DEFAULT_ALL)
        assertNull(notification.tickerText)
    }

    @Test
    fun showWhenHidesTheTimestampWhileKeepingItForOrdering() {
        val notification = startWith(payload = progressPayload("\"when\":1758540000000,\"showWhen\":false,"))

        assertEquals(1758540000000L, notification.`when`)
        assertFalse(notification.extras.getBoolean(Notification.EXTRA_SHOW_WHEN, true))
    }

    @Test
    fun aTimestampIsShownWhenShowWhenIsLeftOut() {
        val notification = startWith(payload = progressPayload("\"when\":1758540000000,"))

        assertEquals(1758540000000L, notification.`when`)
        assertTrue(notification.extras.getBoolean(Notification.EXTRA_SHOW_WHEN, false))
    }

    @Test
    fun chronometerCountDownCountsTheChronometerDown() {
        val notification =
            startWith(
                payload = progressPayload("\"when\":1758540000000,\"chronometer\":true,\"chronometerCountDown\":true,"),
            )

        assertTrue(notification.extras.getBoolean(Notification.EXTRA_CHRONOMETER_COUNT_DOWN, false))
    }

    @Test
    @Config(sdk = [24, 25])
    fun chronometerCountDownIsAppliedOnTheOldestSupportedReleases() {
        // `setChronometerCountDown` arrived exactly at minSdk 24, the one ungated call sitting on
        // the floor of the supported range, so it has to be proven there rather than by the docs.
        val notification =
            startWith(
                payload = progressPayload("\"when\":1758540000000,\"chronometer\":true,\"chronometerCountDown\":true,"),
            )

        assertTrue(notification.extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER, false))
        assertTrue(notification.extras.getBoolean(Notification.EXTRA_CHRONOMETER_COUNT_DOWN, false))
    }

    @Test
    @Config(sdk = [29])
    fun contextualActionsOptionIsAppliedFromApi29() {
        assertFalse(startWith(allowSystemGeneratedContextualActions = false).allowSystemGeneratedContextualActions)
        assertTrue(startWith(allowSystemGeneratedContextualActions = true).allowSystemGeneratedContextualActions)
        assertTrue(startWith().allowSystemGeneratedContextualActions)
    }

    @Test
    @Config(sdk = [28])
    fun contextualActionsOptionIsNotAppliedBelowApi29() {
        val notification = startWith(allowSystemGeneratedContextualActions = false)

        assertFalse(notification.extras.containsKey("android.allowSystemGeneratedContextualActions"))
    }

    @Test
    fun aRecordWrittenByAnOlderReleaseStillPostsAtTheDefaults() {
        // Exactly the record 2.3.1 wrote: no presentation object and no new payload keys.
        writeRecords(
            """
            {"legacy-ride":{"notificationId":"legacy-ride","systemNotificationId":12345,
            "channelId":"voltra.test","smallIcon":"ic_legacy","deepLinkUrl":"myapp://rides/44",
            "requestPromotedOngoing":false,"fallbackBehavior":"standard","active":true,"dismissed":false}}
            """.trimIndent().replace("\n", ""),
        )

        val posted = updateOn("legacy-ride", AndroidOngoingNotificationOptions())

        assertNull(posted.publicVersion)
        assertEquals(0, posted.color)
        assertEquals("progress", posted.category)
        assertEquals(Notification.VISIBILITY_PRIVATE, posted.visibility)
        assertEquals(0L, posted.getTimeoutAfter())
        assertEquals(0, posted.flags and Notification.FLAG_LOCAL_ONLY)
        assertNull(posted.group)
        assertTrue(posted.flags and Notification.FLAG_ONGOING_EVENT != 0)

        // The stored record keeps its own system id rather than allocating a new one.
        assertNotNull(shadowOf(notificationManager).getNotification(12345))
    }

    /**
     * Starts a fresh notification with these presentation options and returns what was posted.
     *
     * Records live for the whole test, so every call starts its own id and reads a tray that holds
     * nothing else.
     */
    private fun startWith(
        payload: String = progressPayload(),
        visibility: String? = null,
        color: String? = null,
        category: String? = null,
        timeoutMs: Long? = null,
        localOnly: Boolean? = null,
        group: String? = null,
        sortKey: String? = null,
        allowSystemGeneratedContextualActions: Boolean? = null,
    ): Notification {
        val options =
            optionsWith(
                visibility = visibility,
                color = color,
                category = category,
                timeoutMs = timeoutMs,
                localOnly = localOnly,
                group = group,
                sortKey = sortKey,
                allowSystemGeneratedContextualActions = allowSystemGeneratedContextualActions,
            ).copy(notificationId = "notification-${++phase}")

        return startPost(payload, options)
    }

    private fun startBigTextWithCategory(): String? = startWith(payload = BIG_TEXT_PAYLOAD).category

    /** Updates the notification [startWith] last posted, which is the one a test is asserting on. */
    private fun updateLatest(options: AndroidOngoingNotificationOptions): Notification =
        updateOn("notification-$phase", options)

    private fun startPost(
        payload: String,
        options: AndroidOngoingNotificationOptions,
    ): Notification {
        clearTray()
        val result = runBlocking { manager.startOngoingNotification(payload, options) }
        assertTrue("the start should have succeeded, was rejected: ${result.reason}", result.ok)

        return lastPosted()
    }

    private fun updateOn(
        notificationId: String,
        options: AndroidOngoingNotificationOptions,
    ): Notification {
        clearTray()
        val result = runBlocking { manager.updateOngoingNotification(notificationId, progressPayload(), options) }
        assertTrue("the update should have succeeded, was rejected: ${result.reason}", result.ok)

        return lastPosted()
    }

    /**
     * Empties the tray without touching the stored records, so a test that posts more than once can
     * still read exactly one notification back.
     */
    private fun clearTray() {
        notificationManager.cancelAll()
    }

    private fun optionsWith(
        visibility: String? = null,
        color: String? = null,
        category: String? = null,
        timeoutMs: Long? = null,
        localOnly: Boolean? = null,
        group: String? = null,
        sortKey: String? = null,
        allowSystemGeneratedContextualActions: Boolean? = null,
        alert: Boolean? = null,
    ): AndroidOngoingNotificationOptions =
        AndroidOngoingNotificationOptions(
            channelId = CHANNEL_ID,
            presentation =
                AndroidOngoingNotificationPresentationUpdate(
                    visibility = sent(visibility),
                    color = sent(color),
                    category = sent(category),
                    timeoutMs = sent(timeoutMs),
                    localOnly = sent(localOnly),
                    group = sent(group),
                    sortKey = sent(sortKey),
                    allowSystemGeneratedContextualActions = sent(allowSystemGeneratedContextualActions),
                ),
            alert = alert,
        )

    /** An option sent with a value, meaning replace and store; a null argument means it was not sent. */
    private fun <T> sent(value: T?): AndroidOngoingNotificationOption<T> =
        value?.let { AndroidOngoingNotificationOption.Value(it) } ?: AndroidOngoingNotificationOption.Unset

    /** An option sent as `null`, meaning clear what is stored and go back to the platform default. */
    private fun cleared(): AndroidOngoingNotificationOption<Nothing> = AndroidOngoingNotificationOption.Cleared

    private fun lastPosted(): Notification = shadowOf(notificationManager).allNotifications.single()

    private fun storedRecord(notificationId: String = "notification-$phase"): AndroidOngoingNotificationRecord? =
        records()[notificationId]

    private fun records(): Map<String, AndroidOngoingNotificationRecord> {
        val raw = prefs().getString("records", null) ?: return emptyMap()
        return Json { ignoreUnknownKeys = true }.decodeFromString(raw)
    }

    private fun writeRecords(raw: String) {
        prefs().edit().putString("records", raw).commit()
    }

    private fun prefs() = context.getSharedPreferences("voltra_ongoing_notifications", Context.MODE_PRIVATE)

    private fun progressPayload(leadingFields: String = ""): String =
        """{"v":1,"kind":"progress","title":"Driver is on the way","text":"Arriving in 8 minutes",""" +
            "$leadingFields\"value\":32,\"max\":100}"

    companion object {
        private const val CHANNEL_ID = "voltra.test"
        private const val PUBLIC_VERSION_FIELDS =
            "\"when\":1758540000000,\"showWhen\":false," +
                "\"publicVersion\":{\"title\":\"Ride in progress\",\"text\":\"Unlock to see driver details\"},"
        private const val BIG_TEXT_PAYLOAD =
            """{"v":1,"kind":"bigText","title":"Match delayed","text":"Rain delay in effect"}"""
    }
}
