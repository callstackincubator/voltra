package voltra.dynamicwidget.serverupdate

import android.os.Build
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Below API 31, WorkManager runs expedited work as a foreground service and calls
 * `CoroutineWorker.getForegroundInfo()`, which [DynamicWidgetServerUpdateWorker] does not
 * override -- crashing the process. [DynamicWidgetServerUpdateScheduler.shouldRunExpedited] is the
 * pure decision behind [DynamicWidgetServerUpdateScheduler.requestImmediateUpdate]; see
 * DynamicWidgetServerUpdateRunnerTest for the rest of that scheduling path.
 */
class DynamicWidgetServerUpdateSchedulerExpeditedTest {
    @Test
    fun `runs expedited on API 31 and above, where the quick foreground-service-free path exists`() {
        assertTrue(
            DynamicWidgetServerUpdateScheduler.shouldRunExpedited(
                requestedExpedited = true,
                sdkInt = Build.VERSION_CODES.S,
            ),
        )
        assertTrue(
            DynamicWidgetServerUpdateScheduler.shouldRunExpedited(
                requestedExpedited = true,
                sdkInt =
                    Build.VERSION_CODES.S + 1,
            ),
        )
    }

    @Test
    fun `falls back to ordinary work below API 31, where expedited work needs a foreground service`() {
        assertFalse(
            DynamicWidgetServerUpdateScheduler.shouldRunExpedited(
                requestedExpedited = true,
                sdkInt = Build.VERSION_CODES.R,
            ),
        )
        assertFalse(DynamicWidgetServerUpdateScheduler.shouldRunExpedited(requestedExpedited = true, sdkInt = 24))
    }

    @Test
    fun `never runs expedited when the caller did not ask for it, regardless of SDK level`() {
        assertFalse(
            DynamicWidgetServerUpdateScheduler.shouldRunExpedited(
                requestedExpedited = false,
                sdkInt = Build.VERSION_CODES.S,
            ),
        )
        assertFalse(
            DynamicWidgetServerUpdateScheduler.shouldRunExpedited(
                requestedExpedited = false,
                sdkInt = Build.VERSION_CODES.R,
            ),
        )
    }
}
