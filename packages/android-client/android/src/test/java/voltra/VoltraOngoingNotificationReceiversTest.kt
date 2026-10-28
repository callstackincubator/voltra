package voltra

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.RemoteInput
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import voltra.events.VoltraEventBus
import voltra.events.VoltraHeadlessEventStarter
import voltra.ongoingnotification.OngoingNotificationEvents

private const val RECEIVERS_CHANNEL_ID = "voltra-receivers"

/**
 * The two ongoing-notification receivers and the tap handler (#316, requirements 18 to 23 and 25):
 * `onReceive` is called directly with the intent the posted PendingIntent carries, and the result is
 * read from the event channel's persisted queue with the same `pop` JavaScript uses.
 */
abstract class VoltraOngoingNotificationReceiversTestBase {
    protected val context: Application = RuntimeEnvironment.getApplication()
    private val notificationManager: NotificationManager by lazy {
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }
    private val manager: VoltraNotificationManager by lazy { VoltraNotificationManager(context) }
    private val actionReceiver = VoltraOngoingNotificationActionReceiver()
    private val dismissedReceiver = VoltraOngoingNotificationDismissedReceiver()

    private val payload =
        """{"v":1,"kind":"progress","title":"Workout","value":18,"max":45,"actions":[""" +
            """{"title":"Pause","actionId":"pause","payload":"set-2"},""" +
            """{"title":"Tip","actionId":"tip","remoteInput":{"key":"tip","choices":["10%","15%"]}},""" +
            """{"title":"Open","deepLinkUrl":"myapp://workout/1"}]}"""

    @Before
    fun setUp() {
        shadowOf(notificationManager).setNotificationsEnabled(true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.createNotificationChannel(
                NotificationChannel(RECEIVERS_CHANNEL_ID, "Receivers", NotificationManager.IMPORTANCE_DEFAULT),
            )
        }
        VoltraHeadlessEventStarter.isAppInForeground = { false }
        VoltraHeadlessEventStarter.startHeadless = { headlessStarts++ }
    }

    @After
    fun tearDown() {
        VoltraHeadlessEventStarter.resetForTests()
    }

    private var headlessStarts = 0

    private fun start(notificationId: String = "workout-1") =
        runBlocking {
            manager.startOngoingNotification(
                payload,
                AndroidOngoingNotificationOptions(notificationId = notificationId, channelId = RECEIVERS_CHANNEL_ID),
            )
        }

    private fun systemId(notificationId: String = "workout-1") =
        VoltraNotificationManager.getRecordSnapshot(context, notificationId)!!.systemNotificationId

    private fun posted(notificationId: String = "workout-1"): Notification? =
        shadowOf(notificationManager).getNotification(systemId(notificationId))

    /** The intent the system would deliver for a press on action [index]. */
    private fun pressIntent(
        index: Int,
        notificationId: String = "workout-1",
    ): Intent = Intent(shadowOf(posted(notificationId)!!.actions[index].actionIntent).savedIntent)

    private fun replyIntent(
        text: String,
        source: Int,
    ): Intent {
        val action = posted()!!.actions[1]
        val intent = Intent(shadowOf(action.actionIntent).savedIntent)
        RemoteInput.addResultsToIntent(action.remoteInputs, intent, Bundle().apply { putCharSequence("tip", text) })
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            RemoteInput.setResultsSource(intent, source)
        }
        return intent
    }

    private fun queued(): List<JSONObject> {
        val popped = VoltraEventBus.pop(context, setOf("interaction", "notificationDismissed", "notificationTapped"))
        return (0 until popped.length()).map(popped::getJSONObject)
    }

    private fun JSONObject.keySet() = keys().asSequence().toSet()

    private fun alertsOnce(notification: Notification?) =
        notification != null && (notification.flags and Notification.FLAG_ONLY_ALERT_ONCE) != 0

    // 18

    @Test
    fun `a press enqueues exactly one interaction for the pressed action`() {
        start()
        val before = System.currentTimeMillis()

        actionReceiver.onReceive(context, pressIntent(0))

        val event = queued().single()
        assertEquals(
            setOf("type", "source", "timestamp", "identifier", "payload", "notificationId", "revision"),
            event.keySet(),
        )
        assertEquals("interaction", event.getString("type"))
        assertEquals("workout-1", event.getString("source"))
        assertEquals("pause", event.getString("identifier"))
        assertEquals("set-2", event.getString("payload"))
        assertEquals("workout-1", event.getString("notificationId"))
        assertEquals(1, event.getInt("revision"))
        assertTrue(event.getLong("timestamp") >= before)
    }

    @Test
    fun `a press starts headless delivery only when the app is not in the foreground`() {
        start()

        actionReceiver.onReceive(context, pressIntent(0))
        VoltraHeadlessEventStarter.isAppInForeground = { true }
        actionReceiver.onReceive(context, pressIntent(0))

        assertEquals(1, headlessStarts)
        assertEquals(2, queued().size)
    }

    @Test
    fun `a press whose headless start fails stays queued`() {
        start()
        VoltraHeadlessEventStarter.startHeadless = { throw IllegalStateException("not allowed") }

        actionReceiver.onReceive(context, pressIntent(0))

        assertEquals("pause", queued().single().getString("identifier"))
    }

    @Test
    fun `a press without a payload reports an empty payload, and two presses are two events`() {
        start()
        val intent = pressIntent(1)

        actionReceiver.onReceive(context, intent)
        actionReceiver.onReceive(context, intent)

        val events = queued()
        assertEquals(listOf("tip", "tip"), events.map { it.getString("identifier") })
        assertEquals(listOf("", ""), events.map { it.getString("payload") })
    }

    @Test
    fun `a press carries the revision of the button that was pressed`() {
        start()
        val stale = pressIntent(0)
        runBlocking { manager.updateOngoingNotification("workout-1", payload, null) }

        actionReceiver.onReceive(context, stale)

        assertEquals(1, queued().single().getInt("revision"))
    }

    // 19

    @Test
    fun `a typed reply reposts silently before the event is enqueued`() {
        start()
        assertFalse(alertsOnce(posted()))
        var repostedBeforeEnqueue = false
        val token = VoltraEventBus.subscribe { repostedBeforeEnqueue = alertsOnce(posted()) }

        try {
            actionReceiver.onReceive(context, replyIntent("thanks\nsee you", RemoteInput.SOURCE_FREE_FORM_INPUT))
        } finally {
            VoltraEventBus.unsubscribe(token)
        }

        assertTrue(repostedBeforeEnqueue)
        assertTrue(shadowOf(notificationManager).allNotifications.isNotEmpty())
        assertTrue(alertsOnce(posted()))
        assertEquals(1, VoltraNotificationManager.getRecordSnapshot(context, "workout-1")!!.revision)
    }

    @Test
    fun `a reply event carries the key, the text and where it came from`() {
        start()

        actionReceiver.onReceive(context, replyIntent("thanks", RemoteInput.SOURCE_FREE_FORM_INPUT))
        actionReceiver.onReceive(context, replyIntent("15%", RemoteInput.SOURCE_CHOICE))

        val replies = queued().map { it.getJSONObject("reply") }
        assertEquals(listOf(setOf("key", "text", "source")), replies.map { it.keySet() }.distinct())
        assertEquals(listOf("tip", "tip"), replies.map { it.getString("key") })
        assertEquals(listOf("thanks", "15%"), replies.map { it.getString("text") })
        val choiceSource = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) "choice" else "freeForm"
        assertEquals(listOf("freeForm", choiceSource), replies.map { it.getString("source") })
    }

    // 24: the queue stores JSON, so a reply and payload survive the round trip unflattened.

    @Test
    fun `a multi-line reply and a payload with slashes and quotes survive the queue`() {
        val text = "line one\nline \"two\" / done"
        val payload = "{\"set\":\"2/3\",\"note\":\"it's \\\"hard\\\"\"}"
        VoltraEventBus.send(
            context,
            OngoingNotificationEvents.interaction(
                notificationId = "workout-1",
                actionId = "tip",
                payload = payload,
                revision = 3,
                reply = OngoingNotificationEvents.Reply("tip", text, "freeForm"),
            ),
        )

        val event = queued().single()
        assertEquals(payload, event.getString("payload"))
        assertEquals(text, event.getJSONObject("reply").getString("text"))
        assertEquals(3, event.getInt("revision"))
    }

    // 20

    @Test
    fun `a reply press without results is a plain press without a repost`() {
        start()

        actionReceiver.onReceive(context, pressIntent(1))

        assertFalse(queued().single().has("reply"))
        assertFalse(alertsOnce(posted()))
    }

    @Test
    fun `a reply whose results lack the key is a plain press without a repost`() {
        start()
        val action = posted()!!.actions[1]
        val intent = Intent(shadowOf(action.actionIntent).savedIntent)
        val other = RemoteInput.Builder("other").build()
        RemoteInput.addResultsToIntent(arrayOf(other), intent, Bundle().apply { putCharSequence("other", "x") })

        actionReceiver.onReceive(context, intent)

        assertFalse(queued().single().has("reply"))
        assertFalse(alertsOnce(posted()))
    }

    // 21

    @Test
    fun `a press on a stopped notification enqueues and posts nothing`() {
        start()
        val press = pressIntent(0)
        val reply = replyIntent("thanks", RemoteInput.SOURCE_FREE_FORM_INPUT)
        manager.stopOngoingNotification("workout-1")

        actionReceiver.onReceive(context, press)
        actionReceiver.onReceive(context, reply)

        assertTrue(queued().isEmpty())
        assertTrue(shadowOf(notificationManager).allNotifications.isEmpty())
        assertEquals(0, headlessStarts)
    }

    @Test
    fun `a press on a dismissed notification enqueues and posts nothing`() {
        start()
        val press = pressIntent(0)
        val reply = replyIntent("thanks", RemoteInput.SOURCE_FREE_FORM_INPUT)
        notificationManager.cancel(systemId())
        VoltraNotificationManager.markDismissed(context, "workout-1")

        actionReceiver.onReceive(context, press)
        actionReceiver.onReceive(context, reply)

        assertTrue(queued().isEmpty())
        assertTrue(shadowOf(notificationManager).allNotifications.isEmpty())
    }

    // 22

    @Test
    fun `the action receiver never starts an activity`() {
        start()
        val inputs =
            listOf(
                pressIntent(0),
                replyIntent("thanks", RemoteInput.SOURCE_FREE_FORM_INPUT),
                pressIntent(1),
                Intent(),
                Intent().putExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID, "unknown"),
            )

        inputs.forEach { actionReceiver.onReceive(context, it) }

        assertNull(shadowOf(context).nextStartedActivity)
    }

    // 23

    @Test
    fun `a dismissal marks the record and enqueues one notificationDismissed`() {
        start()

        dismissedReceiver.onReceive(
            context,
            Intent().putExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID, "workout-1"),
        )

        assertTrue(VoltraNotificationManager.getRecordSnapshot(context, "workout-1")!!.dismissed)
        val event = queued().single()
        assertEquals(setOf("type", "source", "timestamp", "notificationId"), event.keySet())
        assertEquals("notificationDismissed", event.getString("type"))
        assertEquals("workout-1", event.getString("notificationId"))
        assertEquals("workout-1", event.getString("source"))
        assertEquals(0, headlessStarts)
    }

    @Test
    fun `stop and endAll enqueue nothing`() {
        start()
        start("workout-2")

        manager.stopOngoingNotification("workout-1")
        manager.endAllOngoingNotifications()

        assertTrue(queued().isEmpty())
    }

    @Test
    fun `a dismissal of an unknown notification enqueues nothing`() {
        dismissedReceiver.onReceive(
            context,
            Intent().putExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID, "never"),
        )

        assertTrue(queued().isEmpty())
    }

    // 25

    @Test
    fun `a tapped launch intent reports notificationTapped once and is stripped`() {
        val intent =
            Intent(Intent.ACTION_MAIN)
                .putExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID, "workout-1")
                .putExtra(VoltraNotificationManager.EXTRA_TAPPED, true)

        assertTrue(VoltraNotificationTapHandler.consume(context, intent))
        assertFalse(VoltraNotificationTapHandler.consume(context, intent))

        assertFalse(intent.hasExtra(VoltraNotificationManager.EXTRA_TAPPED))
        val event = queued().single()
        assertEquals(setOf("type", "source", "timestamp", "notificationId"), event.keySet())
        assertEquals("notificationTapped", event.getString("type"))
        assertEquals("workout-1", event.getString("notificationId"))
        assertEquals("workout-1", event.getString("source"))
        assertEquals(0, headlessStarts)
    }

    @Test
    fun `an intent without the tap marker reports nothing`() {
        assertFalse(VoltraNotificationTapHandler.consume(context, Intent(Intent.ACTION_MAIN)))
        assertFalse(VoltraNotificationTapHandler.consume(context, null))

        assertTrue(queued().isEmpty())
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [24])
class VoltraOngoingNotificationReceiversApi24Test : VoltraOngoingNotificationReceiversTestBase()

@RunWith(RobolectricTestRunner::class)
class VoltraOngoingNotificationReceiversTest : VoltraOngoingNotificationReceiversTestBase()
