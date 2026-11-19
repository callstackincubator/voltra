package voltra

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import voltra.events.VoltraEventBus
import voltra.ongoingnotification.VoltraNotificationException

private const val ACTIONS_CHANNEL_ID = "voltra-actions"

/**
 * Notification building for ongoing-notification actions (#316, requirements 7 to 16 and 30), run
 * on both sides of the API 28 (`setSemanticAction`) and API 31 (`setAuthenticationRequired`,
 * `FLAG_MUTABLE`) gates. Assertions are made on the `Notification` captured by
 * `ShadowNotificationManager` and on the shadows of its PendingIntents.
 */
abstract class VoltraOngoingNotificationActionsTestBase {
    protected val context: Application = RuntimeEnvironment.getApplication()
    protected val notificationManager: NotificationManager by lazy {
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }
    protected val manager: VoltraNotificationManager by lazy { VoltraNotificationManager(context) }

    @Before
    fun setUp() {
        shadowOf(notificationManager).setNotificationsEnabled(true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.createNotificationChannel(
                NotificationChannel(ACTIONS_CHANNEL_ID, "Actions", NotificationManager.IMPORTANCE_DEFAULT),
            )
        }
    }

    protected fun payloadWithActions(vararg actions: String): String =
        """{"v":1,"kind":"progress","title":"Workout","value":18,"max":45,"actions":[${actions.joinToString(",")}]}"""

    protected fun start(
        payload: String,
        notificationId: String = "workout-1",
    ): AndroidOngoingNotificationStartResult =
        runBlocking {
            manager.startOngoingNotification(
                payload,
                AndroidOngoingNotificationOptions(notificationId = notificationId, channelId = ACTIONS_CHANNEL_ID),
            )
        }

    protected fun update(
        payload: String,
        notificationId: String = "workout-1",
    ) = runBlocking { manager.updateOngoingNotification(notificationId, payload, null) }

    protected fun record(notificationId: String = "workout-1") =
        VoltraNotificationManager.getRecordSnapshot(context, notificationId)
            ?: throw AssertionError("Expected a record for $notificationId")

    protected fun posted(notificationId: String = "workout-1"): Notification =
        shadowOf(notificationManager).getNotification(record(notificationId).systemNotificationId)
            ?: throw AssertionError("Expected $notificationId to be posted")

    protected fun queuedEvents() =
        VoltraEventBus.pop(context, setOf("interaction", "notificationDismissed", "notificationTapped")).let { popped ->
            (0 until popped.length()).map(popped::getJSONObject)
        }

    // 7

    @Test
    fun `a deep link action decodes without the event fields and an event action without deepLinkUrl`() {
        start(
            payloadWithActions(
                """{"title":"Open","deepLinkUrl":"myapp://workout/1"}""",
                """{"title":"Pause","actionId":"pause","payload":"p",""" +
                    """"authenticationRequired":true,"semanticAction":"none",""" +
                    """"remoteInput":{"key":"why","label":"Why?","allowFreeFormInput":false,"choices":["Tired"]}}""",
            ),
        )

        assertEquals(listOf("Open", "Pause"), posted().actions.map { it.title.toString() })
    }

    @Test
    fun `an action with neither deepLinkUrl nor actionId fails start before anything is posted`() {
        try {
            start(payloadWithActions("""{"title":"Nothing"}"""))
            throw AssertionError("Expected the start to be rejected")
        } catch (error: VoltraNotificationException) {
            assertEquals(VoltraNotificationException.INVALID_PAYLOAD, error.code)
            assertTrue(generateSequence(error.cause) { it.cause }.any { it is IllegalArgumentException })
        }

        assertTrue(shadowOf(notificationManager).allNotifications.isEmpty())
        assertNull(VoltraNotificationManager.getRecordSnapshot(context, "workout-1"))
    }

    // 8

    @Test
    fun `a deep link action stays an Activity PendingIntent for the deep link`() {
        start(payloadWithActions("""{"title":"Open","deepLinkUrl":"myapp://workout/1"}"""))

        val pendingIntent = shadowOf(posted().actions[0].actionIntent)
        assertTrue(pendingIntent.isActivityIntent)
        assertEquals(Intent.ACTION_VIEW, pendingIntent.savedIntent.action)
        assertEquals("myapp://workout/1", pendingIntent.savedIntent.dataString)
        assertEquals(context.packageName, pendingIntent.savedIntent.`package`)
    }

    // 9

    @Test
    fun `an event action is a broadcast PendingIntent to the action receiver`() {
        start(payloadWithActions("""{"title":"Pause","actionId":"pause","payload":"order/1 \"x\""}"""))

        val pendingIntent = shadowOf(posted().actions[0].actionIntent)
        assertTrue(pendingIntent.isBroadcastIntent)
        val intent = pendingIntent.savedIntent
        assertEquals(VoltraOngoingNotificationActionReceiver::class.java.name, intent.component?.className)
        assertEquals("voltra.action.ONGOING_NOTIFICATION_ACTION", intent.action)
        assertEquals("voltra://ongoing-notification/workout-1/actions/0", intent.dataString)
        assertEquals("workout-1", intent.getStringExtra("voltra.extra.NOTIFICATION_ID"))
        assertEquals("pause", intent.getStringExtra("voltra.extra.ACTION_ID"))
        assertEquals(0, intent.getIntExtra("voltra.extra.ACTION_INDEX", -1))
        assertEquals(1, intent.getIntExtra("voltra.extra.REVISION", -1))
        assertEquals("order/1 \"x\"", intent.getStringExtra("voltra.extra.ACTION_PAYLOAD"))
        assertFalse(intent.hasExtra("voltra.extra.REMOTE_INPUT_KEY"))
    }

    @Test
    fun `an event action without a payload carries no payload extra`() {
        start(payloadWithActions("""{"title":"Pause","actionId":"pause"}"""))

        assertFalse(shadowOf(posted().actions[0].actionIntent).savedIntent.hasExtra("voltra.extra.ACTION_PAYLOAD"))
    }

    @Test
    fun `an update carries the new revision on the buttons`() {
        start(payloadWithActions("""{"title":"Pause","actionId":"pause"}"""))
        update(payloadWithActions("""{"title":"Resume","actionId":"resume"}"""))

        val intent = shadowOf(posted().actions[0].actionIntent).savedIntent
        assertEquals("resume", intent.getStringExtra("voltra.extra.ACTION_ID"))
        assertEquals(2, intent.getIntExtra("voltra.extra.REVISION", -1))
    }

    // 10

    @Test
    fun `every action PendingIntent uses the slot's request code and two event actions never collide`() {
        start(
            payloadWithActions(
                """{"title":"Pause","actionId":"pause"}""",
                """{"title":"Stop","actionId":"stop"}""",
                """{"title":"Open","deepLinkUrl":"myapp://workout/1"}""",
            ),
        )

        val systemId = record().systemNotificationId
        val shadows = posted().actions.map { shadowOf(it.actionIntent) }
        shadows.forEachIndexed { index, shadow ->
            assertEquals(VoltraNotificationManager.createActionRequestCode(systemId, index), shadow.requestCode)
        }
        assertTrue(shadows[0].requestCode != shadows[1].requestCode)
        assertFalse(shadows[0].savedIntent.filterEquals(shadows[1].savedIntent))
    }

    // 11

    @Test
    fun `an event action without remoteInput is immutable`() {
        start(payloadWithActions("""{"title":"Pause","actionId":"pause"}"""))

        assertEquals(
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            shadowOf(posted().actions[0].actionIntent).flags,
        )
    }

    @Test
    fun `an event action with remoteInput is mutable and carries its key`() {
        start(payloadWithActions("""{"title":"Tip","actionId":"tip","remoteInput":{"key":"tip"}}"""))

        val shadow = shadowOf(posted().actions[0].actionIntent)
        val expected =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        assertEquals(expected, shadow.flags)
        assertEquals("tip", shadow.savedIntent.getStringExtra("voltra.extra.REMOTE_INPUT_KEY"))
    }

    // 12

    @Test
    fun `remoteInput becomes one RemoteInput on the action`() {
        start(
            payloadWithActions(
                """{"title":"Tip","actionId":"tip","remoteInput":{"key":"tip","label":"Tip amount","choices":["10%","15%","20%"]}}""",
                """{"title":"Why","actionId":"why","remoteInput":{"key":"why","allowFreeFormInput":false,"choices":["Tired"]}}""",
            ),
        )

        val tip = posted().actions[0].remoteInputs.single()
        assertEquals("tip", tip.resultKey)
        assertEquals("Tip amount", tip.label.toString())
        assertTrue(tip.allowFreeFormInput)
        assertEquals(listOf("10%", "15%", "20%"), tip.choices.map { it.toString() })

        val why = posted().actions[1].remoteInputs.single()
        assertFalse(why.allowFreeFormInput)
        assertEquals(listOf("Tired"), why.choices.map { it.toString() })
    }

    @Test
    fun `an action without remoteInput has none`() {
        start(payloadWithActions("""{"title":"Pause","actionId":"pause"}"""))

        assertNull(posted().actions[0].remoteInputs)
    }

    // 13

    @Test
    fun `authenticationRequired applies from API 31 only`() {
        start(
            payloadWithActions(
                """{"title":"Stop","actionId":"stop","authenticationRequired":true}""",
                """{"title":"Open","deepLinkUrl":"myapp://x","authenticationRequired":true}""",
            ),
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            assertTrue(posted().actions.all { it.isAuthenticationRequired })
        } else {
            // Nothing to read below API 31; the action still builds and posts.
            assertEquals(2, posted().actions.size)
        }
    }

    @Test
    fun `semanticAction maps to the platform constant from API 28 only`() {
        val names =
            listOf(
                "none" to 0,
                "reply" to 1,
                "markAsRead" to 2,
                "markAsUnread" to 3,
                "delete" to 4,
                "archive" to 5,
                "mute" to 6,
                "unmute" to 7,
                "thumbsUp" to 8,
                "thumbsDown" to 9,
                "call" to 10,
                "somethingNewer" to 0,
            )
        names.forEachIndexed { index, (name, constant) ->
            val id = "semantic-$index"
            start(payloadWithActions("""{"title":"A","actionId":"a","semanticAction":"$name"}"""), notificationId = id)
            val action = posted(id).actions[0]
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                assertEquals("semanticAction $name", constant, action.semanticAction)
            }
        }
    }

    // 14

    @Test
    fun `start stores the payload with revision 1 and every update increments it`() {
        val first = payloadWithActions("""{"title":"Pause","actionId":"pause"}""")
        val second = payloadWithActions("""{"title":"Resume","actionId":"resume"}""")

        start(first)
        assertEquals(1, record().revision)
        assertEquals(first, record().lastPayload)

        update(second)
        assertEquals(2, record().revision)
        assertEquals(second, record().lastPayload)
    }

    // 15

    @Test
    fun `the content intent stays an Activity intent and carries the tap extras`() {
        shadowOf(context.packageManager).addActivityIfNotPresent(
            android.content.ComponentName(context.packageName, "voltra.test.LaunchActivity"),
        )
        shadowOf(context.packageManager).addIntentFilterForActivity(
            android.content.ComponentName(context.packageName, "voltra.test.LaunchActivity"),
            android.content.IntentFilter(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_LAUNCHER) },
        )
        start(payloadWithActions("""{"title":"Pause","actionId":"pause"}"""))

        val contentIntent = posted().contentIntent
        assertNotNull(contentIntent)
        val shadow = shadowOf(contentIntent)
        assertTrue(shadow.isActivityIntent)
        assertEquals("workout-1", shadow.savedIntent.getStringExtra("voltra.extra.NOTIFICATION_ID"))
        assertTrue(shadow.savedIntent.getBooleanExtra("voltra.extra.TAPPED", false))
    }

    // 16

    @Test
    fun `stop cancels the action PendingIntents and enqueues nothing`() {
        start(
            payloadWithActions(
                """{"title":"Pause","actionId":"pause"}""",
                """{"title":"Tip","actionId":"tip","remoteInput":{"key":"tip"}}""",
                """{"title":"Open","deepLinkUrl":"myapp://workout/1"}""",
            ),
        )
        val actions = posted().actions.map { it.actionIntent }

        manager.stopOngoingNotification("workout-1")

        actions.forEach { assertTrue(shadowOf(it).isCanceled) }
        assertTrue(queuedEvents().isEmpty())
    }

    @Test
    fun `endAll cancels the action PendingIntents of every notification and enqueues nothing`() {
        start(payloadWithActions("""{"title":"Pause","actionId":"pause"}"""), notificationId = "a")
        start(payloadWithActions("""{"title":"Open","deepLinkUrl":"myapp://b"}"""), notificationId = "b")
        val actions = listOf(posted("a"), posted("b")).map { it.actions[0].actionIntent }

        manager.endAllOngoingNotifications()

        actions.forEach { assertTrue(shadowOf(it).isCanceled) }
        assertTrue(queuedEvents().isEmpty())
    }

    // 30

    @Test
    fun `capabilities report the action API gates`() {
        val capabilities = manager.getOngoingNotificationCapabilities()

        assertEquals(Build.VERSION.SDK_INT >= 31, capabilities.supportsAuthenticationRequiredActions)
        assertEquals(Build.VERSION.SDK_INT >= 28, capabilities.supportsSemanticActions)
    }

    @Test
    fun `the remote input flag is only mutable where the platform has FLAG_MUTABLE`() {
        assumeTrue(Build.VERSION.SDK_INT < Build.VERSION_CODES.S)
        start(payloadWithActions("""{"title":"Tip","actionId":"tip","remoteInput":{"key":"tip"}}"""))

        assertEquals(0, shadowOf(posted().actions[0].actionIntent).flags and PendingIntent.FLAG_IMMUTABLE)
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [24])
class VoltraOngoingNotificationActionsApi24Test : VoltraOngoingNotificationActionsTestBase()

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class VoltraOngoingNotificationActionsApi28Test : VoltraOngoingNotificationActionsTestBase()

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [31])
class VoltraOngoingNotificationActionsApi31Test : VoltraOngoingNotificationActionsTestBase()

@RunWith(RobolectricTestRunner::class)
class VoltraOngoingNotificationActionsTest : VoltraOngoingNotificationActionsTestBase()
