package voltra.dynamicwidget.serverupdate

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import voltra.widget.server.WidgetScope

/**
 * Below API 31, WorkManager runs expedited work as a foreground service and calls
 * `CoroutineWorker.getForegroundInfo()`, which [DynamicWidgetServerUpdateWorker] does not override
 * — the default implementation throws and takes the process with it, about a second after any
 * "refresh now" request.
 *
 * These run at real SDK levels and read the flag back off the request
 * [DynamicWidgetServerUpdateScheduler] actually builds, rather than restating the decision against
 * the same constant the decision uses: reverting the `setExpedited` call to an unguarded
 * `else if (expedited)` has to turn the API 30 case red.
 */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetServerUpdateSchedulerExpeditedTest {
    private val scope = WidgetScope.of("portfolio")

    /** What `requestImmediateUpdate` asks for: no delay, expedited requested. */
    private fun immediateRequestIsExpedited(): Boolean =
        DynamicWidgetServerUpdateScheduler
            .buildOneTimeRequest(scope, delayMinutes = 0L, expedited = true)
            .workSpec
            .expedited

    @Test
    @Config(sdk = [31])
    fun `runs expedited on API 31, where the foreground-service-free path exists`() {
        assertTrue(immediateRequestIsExpedited())
    }

    @Test
    @Config(sdk = [34])
    fun `keeps running expedited above API 31`() {
        assertTrue(immediateRequestIsExpedited())
    }

    @Test
    @Config(sdk = [30])
    fun `falls back to ordinary work on API 30, where expedited work needs a foreground service`() {
        assertFalse(immediateRequestIsExpedited())
    }

    @Test
    @Config(sdk = [28])
    fun `falls back to ordinary work well below API 31`() {
        assertFalse(immediateRequestIsExpedited())
    }

    @Test
    @Config(sdk = [34])
    fun `a delayed retry is never expedited, even where expedited work is safe`() {
        // requestDelayedUpdate carries the server's Retry-After, so it must wait rather than jump
        // the queue; setInitialDelay and setExpedited are mutually exclusive in WorkManager anyway.
        assertFalse(
            DynamicWidgetServerUpdateScheduler
                .buildOneTimeRequest(scope, delayMinutes = 5L, expedited = false)
                .workSpec
                .expedited,
        )
    }
}
