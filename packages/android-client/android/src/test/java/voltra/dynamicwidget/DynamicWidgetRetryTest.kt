package voltra.dynamicwidget

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import voltra.dynamicwidget.DynamicWidgetRetryActionCallback.Companion.runRetry

class DynamicWidgetRetryTest {
    @Test
    fun runsTheRetry() =
        runBlocking {
            val calls = mutableListOf<String>()

            val ran = runRetry("retry-order") { calls += "retry" }

            assertTrue(ran)
            assertEquals(listOf("retry"), calls)
        }

    @Test
    fun aTapDuringARetryOfTheSameWidgetIdDoesNothing() =
        runBlocking {
            val gate = CompletableDeferred<Unit>()
            val calls = mutableListOf<String>()
            val first =
                async(start = CoroutineStart.UNDISPATCHED) {
                    runRetry("retry-concurrent") {
                        calls += "first"
                        gate.await()
                    }
                }

            val second = runRetry("retry-concurrent") { calls += "second" }

            assertFalse(second)
            assertEquals(listOf("first"), calls)

            gate.complete(Unit)
            assertTrue(first.await())
        }

    @Test
    fun aRetryOfAnotherWidgetIdIsNotBlockedByARunningOne() =
        runBlocking {
            val gate = CompletableDeferred<Unit>()
            val first =
                async(start = CoroutineStart.UNDISPATCHED) { runRetry("retry-a") { gate.await() } }

            val other = runRetry("retry-b") {}

            assertTrue(other)
            gate.complete(Unit)
            first.await()
            Unit
        }

    @Test
    fun aFinishedRetryDoesNotBlockTheNextTap() =
        runBlocking {
            assertTrue(runRetry("retry-twice") {})
            assertTrue(runRetry("retry-twice") {})
        }

    @Test
    fun aFailingRetryStillReleasesTheWidgetId() =
        runBlocking {
            try {
                runRetry("retry-fails") { error("boom") }
            } catch (expected: IllegalStateException) {
                // The callback surfaces it; the point is the guard below.
            }

            assertTrue(runRetry("retry-fails") {})
        }

    @Test
    fun theRetryActionNameIsPinned() {
        assertEquals(
            "voltra.dynamicwidget.DynamicWidgetRetryActionCallback",
            DynamicWidgetRetryActionCallback::class.java.name,
        )
    }
}
