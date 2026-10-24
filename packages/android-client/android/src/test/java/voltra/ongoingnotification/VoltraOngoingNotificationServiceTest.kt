package voltra.ongoingnotification

import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import voltra.AndroidOngoingNotificationOptions
import voltra.VoltraNotificationManager
import voltra.VoltraOngoingNotificationDismissedReceiver

@RunWith(RobolectricTestRunner::class)
class VoltraOngoingNotificationServiceTest {
    private val context = RuntimeEnvironment.getApplication()
    private lateinit var notificationManager: NotificationManager

    @Before
    fun setUp() {
        notificationManager = context.prepareForOngoingNotifications()
    }

    /** Posts a notification whose record says it wants the service, without attaching it. */
    private fun postRecord(
        notificationId: String = "workout",
        onDismiss: String? = null,
    ): Int {
        val manager =
            VoltraNotificationManager(
                context,
                FakeForegroundServiceController(context, attachResult = {
                    AndroidOngoingNotificationForegroundServiceResult.failed("attach_timeout")
                }),
            )
        runBlocking {
            manager.startOngoingNotification(
                testPayload(),
                AndroidOngoingNotificationOptions(
                    notificationId = notificationId,
                    channelId = TEST_CHANNEL_ID,
                    foregroundService = AndroidOngoingNotificationForegroundServiceOptions("dataSync", onDismiss),
                ),
            )
        }
        // The fake's failure wrote `failed`; the real flow attaches from a clean state.
        VoltraNotificationManager.updateForegroundServiceState(context, notificationId, "pending")
        return manager.getOngoingNotificationHandle(notificationId)!!.systemNotificationId
    }

    private fun attachIntent(notificationId: String = "workout") =
        VoltraOngoingNotificationService.attachIntent(
            context,
            notificationId,
            "dataSync",
            VoltraNotificationManager(context).getOngoingNotificationHandle(notificationId)?.systemNotificationId
                ?: PLACEHOLDER_SYSTEM_ID,
            TEST_CHANNEL_ID,
        )

    private fun status(notificationId: String = "workout") =
        VoltraNotificationManager(context).getOngoingNotificationStatus(notificationId).foregroundService

    @Test
    fun attachRunsTheNotificationInTheForegroundUnderItsSystemId() {
        val systemId = postRecord()
        val outcome = VoltraOngoingNotificationForegroundServiceRegistry.expectAttach("workout")

        val controller =
            Robolectric
                .buildService(
                    VoltraOngoingNotificationService::class.java,
                    attachIntent(),
                ).create()
                .startCommand(0, 1)
        val service = controller.get()

        assertEquals(systemId, shadowOf(service).lastForegroundNotificationId)
        assertTrue(systemId != 0)
        assertEquals(AndroidOngoingNotificationForegroundServiceResult.attached("dataSync"), outcome.getCompleted())
        assertEquals("workout", VoltraOngoingNotificationForegroundServiceRegistry.attachedNotificationId)
        assertEquals(FOREGROUND_SERVICE_STATE_ATTACHED, status()?.state)
    }

    @Test
    @Config(sdk = [28])
    fun belowApi29AttachUsesTheTwoArgumentStartForeground() {
        val systemId = postRecord()

        val service =
            Robolectric
                .buildService(
                    VoltraOngoingNotificationService::class.java,
                    attachIntent(),
                ).create()
                .startCommand(0, 1)
                .get()

        assertEquals(systemId, shadowOf(service).lastForegroundNotificationId)
    }

    @Test
    fun theServiceIsNotStickyAndCannotBeBound() {
        val service = Robolectric.buildService(VoltraOngoingNotificationService::class.java).create().get()

        assertEquals(Service.START_NOT_STICKY, service.onStartCommand(Intent(), 0, 1))
        assertNull(service.onBind(Intent()))
    }

    @Test
    fun attachForAnUnknownNotificationGoesForegroundWithAPlaceholderBeforeStopping() {
        val outcome = VoltraOngoingNotificationForegroundServiceRegistry.expectAttach("never-posted")

        val service =
            Robolectric
                .buildService(VoltraOngoingNotificationService::class.java, attachIntent("never-posted"))
                .create()
                .startCommand(0, 1)
                .get()

        // Stopping without startForeground would crash the app after startForegroundService.
        assertEquals(PLACEHOLDER_SYSTEM_ID, shadowOf(service).lastForegroundNotificationId)
        assertTrue(shadowOf(service).isForegroundStopped)
        assertTrue(shadowOf(service).notificationShouldRemoved)
        assertTrue(shadowOf(service).isStoppedBySelf)
        assertFalse(outcome.getCompleted().attached)
        assertNull(VoltraOngoingNotificationForegroundServiceRegistry.attachedNotificationId)
    }

    @Test
    fun aNotificationStoppedBeforeTheServiceRanIsNotAttached() {
        postRecord()
        val intent = attachIntent()
        runBlocking {
            VoltraNotificationManager(
                context,
                FakeForegroundServiceController(context),
            ).stopOngoingNotification("workout")
        }

        val service =
            Robolectric
                .buildService(VoltraOngoingNotificationService::class.java, intent)
                .create()
                .startCommand(0, 1)
                .get()

        assertTrue(shadowOf(service).notificationShouldRemoved)
        assertTrue(shadowOf(service).isStoppedBySelf)
        assertNull(VoltraOngoingNotificationForegroundServiceRegistry.attachedNotificationId)
    }

    @Test
    fun attachUsesTheNotificationTheManagerJustPosted() {
        postRecord()
        val posted =
            android.app.Notification
                .Builder(context, TEST_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.sym_def_app_icon)
                .setContentTitle("As posted")
                .build()
        VoltraOngoingNotificationForegroundServiceRegistry.offerPostedNotification("workout", posted)

        val service =
            Robolectric
                .buildService(VoltraOngoingNotificationService::class.java, attachIntent())
                .create()
                .startCommand(0, 1)
                .get()

        assertEquals(
            "As posted",
            shadowOf(service).lastForegroundNotification.extras.getString(android.app.Notification.EXTRA_TITLE),
        )
    }

    @Test
    fun stopWithRemoveTakesTheNotificationDown() {
        postRecord()
        val controller =
            Robolectric
                .buildService(
                    VoltraOngoingNotificationService::class.java,
                    attachIntent(),
                ).create()
                .startCommand(0, 1)

        val service = controller.get()
        service.onStartCommand(VoltraOngoingNotificationService.stopIntent(context, "workout", true), 0, 2)

        assertTrue(shadowOf(service).isForegroundStopped)
        assertTrue(shadowOf(service).notificationShouldRemoved)
        assertTrue(shadowOf(service).isStoppedBySelf)

        controller.destroy()
        assertNull(VoltraOngoingNotificationForegroundServiceRegistry.attachedNotificationId)
        assertEquals(FOREGROUND_SERVICE_STATE_DETACHED, status()?.state)
    }

    @Test
    @Config(sdk = [35])
    fun aTimeoutDetachesButLeavesTheNotificationPosted() {
        postRecord()
        val controller =
            Robolectric
                .buildService(
                    VoltraOngoingNotificationService::class.java,
                    attachIntent(),
                ).create()
                .startCommand(0, 1)

        controller.get().onTimeout(1, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        controller.destroy()

        assertTrue(shadowOf(controller.get()).isForegroundStopped)
        assertFalse(shadowOf(controller.get()).notificationShouldRemoved)
        // onDestroy must not overwrite the timeout.
        assertEquals(FOREGROUND_SERVICE_STATE_TIMED_OUT, status()?.state)
    }

    @Test
    fun aDismissalStopsAnAttachedServiceWithoutRemovingOrReposting() {
        postRecord()
        Robolectric
            .buildService(
                VoltraOngoingNotificationService::class.java,
                attachIntent(),
            ).create()
            .startCommand(0, 1)
        val postedBefore = shadowOf(notificationManager).allNotifications.size

        VoltraOngoingNotificationDismissedReceiver().onReceive(
            context,
            Intent().putExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID, "workout"),
        )

        val started = shadowOf(context).nextStartedService
        assertEquals(VoltraOngoingNotificationService.ACTION_STOP, started.action)
        assertFalse(started.getBooleanExtra(VoltraOngoingNotificationService.EXTRA_REMOVE_NOTIFICATION, true))
        assertTrue(VoltraNotificationManager(context).getOngoingNotificationStatus("workout").isDismissed)
        assertEquals(postedBefore, shadowOf(notificationManager).allNotifications.size)
    }

    @Test
    fun aDismissalWithKeepLeavesTheServiceRunning() {
        postRecord(onDismiss = FOREGROUND_SERVICE_ON_DISMISS_KEEP)
        Robolectric
            .buildService(
                VoltraOngoingNotificationService::class.java,
                attachIntent(),
            ).create()
            .startCommand(0, 1)

        VoltraOngoingNotificationDismissedReceiver().onReceive(
            context,
            Intent().putExtra(VoltraNotificationManager.EXTRA_NOTIFICATION_ID, "workout"),
        )

        assertNull(shadowOf(context).nextStartedService)
        assertTrue(VoltraNotificationManager(context).getOngoingNotificationStatus("workout").isDismissed)
        assertEquals("workout", VoltraOngoingNotificationForegroundServiceRegistry.attachedNotificationId)
    }

    @Test
    @Config(sdk = [34])
    fun locationWithoutALocationPermissionIsCaughtBeforeTheServiceStarts() {
        val controller = SystemForegroundServiceController(context)

        assertEquals("missing_permission", controller.missingPrerequisite("location"))
        assertEquals("missing_permission", controller.missingPrerequisite("health"))
        assertNull(controller.missingPrerequisite("dataSync"))

        shadowOf(context).grantPermissions(
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.Manifest.permission.ACCESS_BACKGROUND_LOCATION,
        )
        assertNull(controller.missingPrerequisite("location"))
    }

    @Test
    @Config(sdk = [33])
    fun prerequisitesAreNotEnforcedBeforeAndroid14() {
        assertNull(SystemForegroundServiceController(context).missingPrerequisite("location"))
    }

    @Test
    fun startForegroundFailuresMapToReasons() {
        assertEquals("missing_permission", foregroundServiceFailureReason(SecurityException("denied")))
        assertEquals("background_start_not_allowed", foregroundServiceFailureReason(IllegalStateException("nope")))
    }

    private companion object {
        const val PLACEHOLDER_SYSTEM_ID = 4242
    }
}
