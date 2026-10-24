package voltra.ongoingnotification

import android.app.Notification
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.pm.ServiceInfo
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import voltra.AndroidOngoingNotificationForegroundServiceStatus
import voltra.AndroidOngoingNotificationOptions
import voltra.VoltraNotificationManager

@RunWith(RobolectricTestRunner::class)
class VoltraNotificationManagerForegroundServiceTest {
    private val context = RuntimeEnvironment.getApplication()
    private lateinit var notificationManager: NotificationManager
    private lateinit var controller: FakeForegroundServiceController
    private lateinit var manager: VoltraNotificationManager

    @Before
    fun setUp() {
        notificationManager = context.prepareForOngoingNotifications()
        controller = FakeForegroundServiceController(context)
        manager = VoltraNotificationManager(context, controller)
    }

    private fun options(
        notificationId: String = "workout",
        type: String? = "dataSync",
        fallbackBehavior: String? = null,
        onDismiss: String? = null,
        revision: Long? = null,
    ) = AndroidOngoingNotificationOptions(
        notificationId = notificationId,
        channelId = TEST_CHANNEL_ID,
        revision = revision,
        foregroundService =
            type?.let { AndroidOngoingNotificationForegroundServiceOptions(it, onDismiss, fallbackBehavior) },
    )

    private fun start(options: AndroidOngoingNotificationOptions) =
        runBlocking { manager.startOngoingNotification(testPayload(), options) }

    @Test
    fun startPostsFirstThenAttachesAndReportsIt() {
        val result = start(options())

        assertTrue(result.ok)
        assertEquals(AndroidOngoingNotificationForegroundServiceResult.attached("dataSync"), result.foregroundService)
        assertEquals(listOf("workout" to "dataSync"), controller.attachCalls)
        assertEquals(1, shadowOf(notificationManager).allNotifications.size)
        assertEquals(
            AndroidOngoingNotificationForegroundServiceStatus("dataSync", FOREGROUND_SERVICE_STATE_ATTACHED),
            manager.getOngoingNotificationStatus("workout").foregroundService,
        )
    }

    @Test
    fun aStartWithoutTheOptionHasNoServiceAndNoStatusField() {
        val result = start(options(type = null))

        assertNull(result.foregroundService)
        assertTrue(controller.attachCalls.isEmpty())
        assertNull(manager.getOngoingNotificationStatus("workout").foregroundService)
    }

    @Test
    @Config(sdk = [31])
    fun aServiceBackedNotificationShowsImmediatelyAndKeepsItsOngoingTraits() {
        start(options())

        val notification = shadowOf(notificationManager).allNotifications.single()
        assertEquals(
            Notification.FOREGROUND_SERVICE_IMMEDIATE,
            ReflectionHelpers.getField<Int>(notification, "mFgsDeferBehavior"),
        )
        assertTrue(notification.flags and Notification.FLAG_ONGOING_EVENT != 0)
        assertEquals("Driver is approaching", notification.extras.getString(Notification.EXTRA_TITLE))
    }

    @Test
    fun anUndeclaredServiceIsReportedWithoutStartingIt() {
        controller.declared = null

        val result = start(options())

        assertTrue(result.ok)
        assertEquals(AndroidOngoingNotificationForegroundServiceResult.failed("not_declared"), result.foregroundService)
        assertTrue(controller.attachCalls.isEmpty())
        assertEquals(1, shadowOf(notificationManager).allNotifications.size)
        assertEquals(
            FOREGROUND_SERVICE_STATE_FAILED,
            manager.getOngoingNotificationStatus("workout").foregroundService?.state,
        )
    }

    @Test
    fun aTypeMissingFromTheManifestIsReportedWithoutStartingTheService() {
        val result = start(options(type = "mediaPlayback"))

        assertEquals(
            AndroidOngoingNotificationForegroundServiceResult.failed("type_not_declared"),
            result.foregroundService,
        )
        assertTrue(controller.attachCalls.isEmpty())
    }

    @Test
    @Config(sdk = [33])
    fun aTypeNewerThanTheRunningApiIsUnsupported() {
        controller.declared = setOf("health")

        val result = start(options(type = "health"))

        assertEquals(
            AndroidOngoingNotificationForegroundServiceResult.failed("unsupported_api"),
            result.foregroundService,
        )
        assertTrue(controller.attachCalls.isEmpty())
    }

    @Test
    @Config(sdk = [28])
    fun belowApi29AnyTypeAttachesBecauseNoneCanBeChecked() {
        controller.declared = emptySet()

        val result = start(options(type = "health"))

        assertEquals(AndroidOngoingNotificationForegroundServiceResult.attached("health"), result.foregroundService)
    }

    @Test
    fun aSecondNotificationFindsTheServiceBusyAndLeavesItAlone() {
        start(options(notificationId = "first"))

        val second = start(options(notificationId = "second"))

        assertTrue(second.ok)
        assertEquals(AndroidOngoingNotificationForegroundServiceResult.failed("busy"), second.foregroundService)
        assertEquals(listOf("first" to "dataSync"), controller.attachCalls)
        assertEquals("first", controller.attachedId)
    }

    @Test
    fun aStandardFallbackKeepsTheNotificationWhenAttachFails() {
        controller.attachResult =
            { AndroidOngoingNotificationForegroundServiceResult.failed("background_start_not_allowed") }

        val result = start(options())

        assertTrue(result.ok)
        assertEquals(
            AndroidOngoingNotificationForegroundServiceResult.failed("background_start_not_allowed"),
            result.foregroundService,
        )
        assertEquals(1, shadowOf(notificationManager).allNotifications.size)
        assertEquals(
            FOREGROUND_SERVICE_STATE_FAILED,
            manager.getOngoingNotificationStatus("workout").foregroundService?.state,
        )
    }

    @Test
    fun anErrorFallbackCancelsTheNotificationRemovesTheRecordAndRejects() {
        controller.attachResult = { AndroidOngoingNotificationForegroundServiceResult.failed("missing_permission") }

        try {
            start(options(fallbackBehavior = "error"))
            fail("Expected the start to reject")
        } catch (error: VoltraNotificationException) {
            assertEquals(VoltraNotificationException.FOREGROUND_SERVICE_UNAVAILABLE, error.code)
            assertTrue(error.message!!.contains("missing_permission"))
        }
        assertTrue(shadowOf(notificationManager).allNotifications.isEmpty())
        assertNull(manager.getOngoingNotificationHandle("workout"))
    }

    @Test
    fun anUpdateKeepsTheSlotAndNeverTouchesTheService() {
        val started = start(options())
        val systemId = manager.getOngoingNotificationHandle("workout")!!.systemNotificationId

        val updated =
            runBlocking {
                manager.updateOngoingNotification(
                    "workout",
                    testPayload("1 stop away"),
                    AndroidOngoingNotificationOptions(),
                )
            }

        assertTrue(started.ok && updated.ok)
        assertEquals(1, controller.attachCalls.size)
        assertTrue(controller.stopCalls.isEmpty())
        assertEquals(systemId, manager.getOngoingNotificationHandle("workout")!!.systemNotificationId)
        val rebuilt = manager.buildNotificationFromRecord("workout")!!.notification
        assertEquals("1 stop away", rebuilt.extras.getCharSequence(Notification.EXTRA_TEXT).toString())
    }

    @Test
    fun anUpsertOnARunningNotificationAttachesTheServiceItDidNotGetAtStart() {
        controller.attachResult =
            { AndroidOngoingNotificationForegroundServiceResult.failed("background_start_not_allowed") }
        start(options())
        controller.attachResult = { AndroidOngoingNotificationForegroundServiceResult.attached(it) }

        val upserted = runBlocking { manager.upsertOngoingNotification(testPayload(), options()) }

        assertEquals("updated", upserted.action)
        assertEquals(AndroidOngoingNotificationForegroundServiceResult.attached("dataSync"), upserted.foregroundService)
        assertEquals(2, controller.attachCalls.size)
        assertEquals(
            FOREGROUND_SERVICE_STATE_ATTACHED,
            manager.getOngoingNotificationStatus("workout").foregroundService?.state,
        )
    }

    @Test
    fun anUpsertOnAnAttachedNotificationReportsItWithoutAttachingAgain() {
        start(options())

        val upserted = runBlocking { manager.upsertOngoingNotification(testPayload(), options()) }

        assertEquals(AndroidOngoingNotificationForegroundServiceResult.attached("dataSync"), upserted.foregroundService)
        assertEquals(1, controller.attachCalls.size)
    }

    @Test
    fun anUpsertWithoutTheOptionLeavesTheServiceAlone() {
        start(options(type = null))

        val upserted = runBlocking { manager.upsertOngoingNotification(testPayload(), options(type = null)) }

        assertNull(upserted.foregroundService)
        assertTrue(controller.attachCalls.isEmpty())
    }

    @Test
    fun aMissingRuntimePermissionIsReportedWithoutStartingTheService() {
        controller.prerequisiteFailure = "missing_permission"

        val result = start(options(type = "location"))

        assertTrue(result.ok)
        assertEquals(
            AndroidOngoingNotificationForegroundServiceResult.failed("missing_permission"),
            result.foregroundService,
        )
        assertTrue(controller.attachCalls.isEmpty())
    }

    @Test
    fun anErrorFallbackRejectsAKnownBlockerBeforePostingAnything() {
        controller.declared = null

        try {
            start(options(fallbackBehavior = "error", revision = 9))
            fail("Expected the start to reject")
        } catch (error: VoltraNotificationException) {
            assertEquals(VoltraNotificationException.FOREGROUND_SERVICE_UNAVAILABLE, error.code)
            assertTrue(error.message!!.contains("not_declared"))
        }
        assertTrue(shadowOf(notificationManager).allNotifications.isEmpty())
        assertNull(manager.getOngoingNotificationHandle("workout"))
    }

    @Test
    fun anErrorFallbackAfterAFailedAttachKeepsTheRevisionSoAnOlderPushCannotRestartIt() {
        controller.attachResult = { AndroidOngoingNotificationForegroundServiceResult.failed("attach_timeout") }
        try {
            start(options(fallbackBehavior = "error", revision = 9))
            fail("Expected the start to reject")
        } catch (_: VoltraNotificationException) {
        }

        val older = start(options(type = null, revision = 8))

        assertEquals("stale_revision", older.reason)
        assertTrue(shadowOf(notificationManager).allNotifications.isEmpty())
    }

    @Test
    fun theServiceIsHandedTheNotificationAsPosted() {
        var offered: Notification? = null
        controller.attachResult = {
            offered = VoltraOngoingNotificationForegroundServiceRegistry.takePostedNotification("workout")
            AndroidOngoingNotificationForegroundServiceResult.attached(it)
        }

        start(options())

        assertEquals("Driver is approaching", offered?.extras?.getString(Notification.EXTRA_TITLE))
        assertNull(VoltraOngoingNotificationForegroundServiceRegistry.takePostedNotification("workout"))
    }

    @Test
    fun payloadsAreStoredOutsideTheRecords() {
        start(options(type = null))

        val prefs = context.getSharedPreferences("voltra_ongoing_notifications", Context.MODE_PRIVATE)
        assertFalse(prefs.getString("records", "")!!.contains("Driver is approaching"))
        assertEquals(testPayload(), prefs.getString("payload.workout", null))

        runBlocking { manager.stopOngoingNotification("workout") }
        assertNull(prefs.getString("payload.workout", null))
    }

    @Test
    fun stopReleasesTheServiceBeforeCancelling() {
        start(options())

        val stopped = runBlocking { manager.stopOngoingNotification("workout") }

        assertTrue(stopped.ok)
        assertEquals(listOf("workout" to true), controller.stopCalls)
        assertTrue(shadowOf(notificationManager).allNotifications.isEmpty())
        assertNull(manager.getOngoingNotificationStatus("workout").foregroundService)
    }

    @Test
    fun endAllReleasesAServiceHoldingANotificationVoltraNoLongerTracks() {
        controller.attachedId = "orphan"

        runBlocking { manager.endAllOngoingNotifications() }

        assertEquals(listOf("orphan" to true), controller.stopCalls)
    }

    @Test
    fun endAllReleasesTheServiceToo() {
        start(options(notificationId = "a"))
        start(options(notificationId = "b", type = null))

        runBlocking { manager.endAllOngoingNotifications() }

        assertEquals(listOf("a" to true), controller.stopCalls)
        assertTrue(shadowOf(notificationManager).allNotifications.isEmpty())
    }

    @Test
    fun restartingADismissedButKeptNotificationDetachesTheOldServiceFirst() {
        start(options(onDismiss = FOREGROUND_SERVICE_ON_DISMISS_KEEP))
        VoltraNotificationManager.markDismissed(context, "workout")

        val restarted = start(options())

        assertTrue(restarted.ok)
        assertEquals(listOf("workout" to false), controller.stopCalls)
        assertEquals(
            AndroidOngoingNotificationForegroundServiceResult.attached("dataSync"),
            restarted.foregroundService,
        )
    }

    @Test
    fun aFreshProcessDetachesRecordsThatStillClaimTheService() {
        start(options())
        controller.attachedId = null

        val afterRestart = VoltraNotificationManager(context, controller)

        assertEquals(
            FOREGROUND_SERVICE_STATE_DETACHED,
            afterRestart.getOngoingNotificationStatus("workout").foregroundService?.state,
        )
    }

    @Test
    fun theHandleAndThePublicBuilderMatchWhatWasPosted() {
        start(options(type = null))

        val handle = manager.getOngoingNotificationHandle("workout")!!
        val posted = shadowOf(notificationManager).allNotifications.single()
        val rebuilt = VoltraOngoingNotifications.buildNotification(context, "workout")!!

        assertEquals("workout", handle.notificationId)
        assertEquals(handle.systemNotificationId, VoltraOngoingNotifications.systemNotificationId(context, "workout"))
        assertEquals(
            posted.extras.getString(Notification.EXTRA_TITLE),
            rebuilt.extras.getString(Notification.EXTRA_TITLE),
        )
        assertEquals(posted.channelId, rebuilt.channelId)
        assertTrue(rebuilt.flags and Notification.FLAG_ONGOING_EVENT != 0)
        assertNull(manager.getOngoingNotificationHandle("missing"))
        assertNull(VoltraOngoingNotifications.buildNotification(context, "missing"))
    }
}

@RunWith(RobolectricTestRunner::class)
class VoltraNotificationManagerRevisionTest {
    private val context = RuntimeEnvironment.getApplication()
    private lateinit var notificationManager: NotificationManager
    private lateinit var manager: VoltraNotificationManager

    @Before
    fun setUp() {
        notificationManager = context.prepareForOngoingNotifications()
        manager = VoltraNotificationManager(context, FakeForegroundServiceController(context))
    }

    private fun upsert(
        revision: Long?,
        text: String = "r$revision",
    ) = runBlocking {
        manager.upsertOngoingNotification(
            testPayload(text),
            AndroidOngoingNotificationOptions(
                notificationId = "order",
                channelId = TEST_CHANNEL_ID,
                revision = revision,
            ),
        )
    }

    private fun postedText(): String? =
        shadowOf(notificationManager)
            .allNotifications
            .singleOrNull()
            ?.extras
            ?.getCharSequence(Notification.EXTRA_TEXT)
            ?.toString()

    @Test
    fun aLowerOrEqualRevisionIsDroppedWithoutPosting() {
        assertTrue(upsert(5).ok)

        val older = upsert(4)
        val same = upsert(5)

        assertEquals("stale_revision", older.reason)
        assertEquals("stale_revision", same.reason)
        assertEquals("r5", postedText())
    }

    @Test
    fun aHigherRevisionIsAppliedAndACallWithoutOneLeavesItAlone() {
        upsert(5)

        assertTrue(upsert(6).ok)
        assertTrue(upsert(null, text = "no revision").ok)
        assertEquals("stale_revision", upsert(6).reason)
        assertEquals("no revision", postedText())
    }

    @Test
    fun startAndUpdateApplyTheSameCheck() {
        upsert(5)

        val update =
            runBlocking {
                manager.updateOngoingNotification(
                    "order",
                    testPayload(),
                    AndroidOngoingNotificationOptions(revision = 3),
                )
            }
        assertEquals("stale_revision", update.reason)

        VoltraNotificationManager.markDismissed(context, "order")
        val start =
            runBlocking {
                manager.startOngoingNotification(
                    testPayload(),
                    AndroidOngoingNotificationOptions(
                        notificationId = "order",
                        channelId = TEST_CHANNEL_ID,
                        revision = 2,
                    ),
                )
            }
        assertEquals("stale_revision", start.reason)
    }

    @Test
    fun aStaleStopCannotEndANotificationANewerPushRestarted() {
        upsert(7)

        val stop = runBlocking { manager.stopOngoingNotification("order", revision = 6) }

        assertFalse(stop.ok)
        assertEquals("stale_revision", stop.reason)
        assertEquals("r7", postedText())
    }

    @Test
    fun aLateOlderUpsertCannotBringBackAStoppedNotification() {
        upsert(42)
        assertTrue(runBlocking { manager.stopOngoingNotification("order", revision = 43) }.ok)

        val late = upsert(42)

        assertEquals("stale_revision", late.reason)
        assertTrue(shadowOf(notificationManager).allNotifications.isEmpty())
        assertTrue(upsert(44).ok)
    }

    @Test
    fun recordsWrittenByTheCurrentReleaseStillDecode() {
        val legacy =
            """{"order":{"notificationId":"order","systemNotificationId":10007,"channelId":"$TEST_CHANNEL_ID",""" +
                """"requestPromotedOngoing":false,"fallbackBehavior":"standard","active":true,"dismissed":false}}"""
        context
            .getSharedPreferences("voltra_ongoing_notifications", Context.MODE_PRIVATE)
            .edit()
            .putString("records", legacy)
            .commit()

        val handle = manager.getOngoingNotificationHandle("order")
        val status = manager.getOngoingNotificationStatus("order")

        assertEquals(10007, handle?.systemNotificationId)
        assertNull(status.foregroundService)
        assertTrue(upsert(1).ok)
    }
}

@RunWith(RobolectricTestRunner::class)
class VoltraNotificationManagerCapabilitiesTest {
    private val context = RuntimeEnvironment.getApplication()

    @Before
    fun setUp() {
        context.prepareForOngoingNotifications()
    }

    private fun declareService(types: Int?) {
        val serviceInfo =
            ServiceInfo().apply {
                name = VoltraOngoingNotificationService::class.java.name
                packageName = context.packageName
                types?.let { ReflectionHelpers.setField(this, "mForegroundServiceType", it) }
            }
        shadowOf(context.packageManager).addOrUpdateService(serviceInfo)
    }

    private fun capabilities() = VoltraNotificationManager(context).getOngoingNotificationCapabilities()

    @Test
    @Config(sdk = [33])
    fun api33IsNotUserDismissible() {
        assertFalse(capabilities().isUserDismissible)
    }

    @Test
    @Config(sdk = [34])
    fun api34IsUserDismissible() {
        assertTrue(capabilities().isUserDismissible)
    }

    @Test
    fun withoutTheServiceNothingIsSupported() {
        val capabilities = capabilities()

        assertFalse(capabilities.supportsForegroundService)
        assertTrue(capabilities.foregroundServiceTypes.isEmpty())
    }

    @Test
    @Config(sdk = [35])
    fun theDeclaredTypesAreReadBackFromTheManifest() {
        declareService(ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)

        val capabilities = capabilities()

        assertTrue(capabilities.supportsForegroundService)
        assertEquals(listOf("location", "dataSync"), capabilities.foregroundServiceTypes)
    }

    @Test
    @Config(sdk = [28])
    fun belowApi29TheServiceIsSupportedButHasNoTypes() {
        declareService(null)

        val capabilities = capabilities()

        assertTrue(capabilities.supportsForegroundService)
        assertTrue(capabilities.foregroundServiceTypes.isEmpty())
        assertNotNull(foregroundServiceInfo(context))
        assertEquals(
            ComponentName(context, VoltraOngoingNotificationService::class.java).className,
            foregroundServiceInfo(context)?.name,
        )
    }
}
