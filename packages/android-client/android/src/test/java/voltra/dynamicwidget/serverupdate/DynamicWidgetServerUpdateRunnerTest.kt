package voltra.dynamicwidget.serverupdate

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import voltra.dynamicwidget.DynamicWidgetPropsPersistence
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.server.ResolvedWidgetServerSettings
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerFetchResult
import voltra.widget.server.WidgetServerUpdateDefaults

/**
 * The ADR 0002 failure table, one row at a time. Every collaborator is a fake, so what is under
 * test is the decision — commit, keep, retry, give up — and nothing else.
 */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetServerUpdateRunnerTest {
    private val scope = WidgetScope.of("portfolio")

    private class RecordingProps : DynamicWidgetPropsPersistence {
        val committed = mutableListOf<String>()

        override fun persistDynamicWidgetProps(
            dynamicWidgetId: String,
            dynamicWidgetPropsJson: String,
        ) {
            committed += dynamicWidgetPropsJson
        }
    }

    private class RecordingStatuses : DynamicWidgetServerStatusSink {
        var successes = 0
        var failures = mutableListOf<Pair<String, Int?>>()
        var disabledFor: WidgetScope? = null

        override fun recordSuccess(
            scope: WidgetScope,
            fetchedAt: Long,
            httpStatus: Int,
        ) {
            successes += 1
        }

        override fun recordFailure(
            scope: WidgetScope,
            error: String,
            httpStatus: Int?,
        ) {
            failures += error to httpStatus
        }

        override fun markDisabledIfNeeded(
            scope: WidgetScope,
            enabled: Boolean,
        ) {
            if (!enabled) disabledFor = scope
        }
    }

    private fun settings(
        url: String? = "https://api.example.com/portfolio",
        enabled: Boolean = true,
    ) = ResolvedWidgetServerSettings(
        url = url,
        intervalMinutes = 15,
        enabled = enabled,
        method = "GET",
        query = emptyMap(),
        headers = emptyMap(),
        body = null,
    )

    private class Harness(
        val props: RecordingProps = RecordingProps(),
        val statuses: RecordingStatuses = RecordingStatuses(),
    ) {
        var notified = 0
        var etags = mutableListOf<Triple<String, String, String?>>()
    }

    private fun runner(
        harness: Harness,
        kind: VoltraWidgetKindResolution = VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Dynamic),
        settings: ResolvedWidgetServerSettings = settings(),
        result: WidgetServerFetchResult = WidgetServerFetchResult.Success("{}", null, 200, null),
        trialRenders: Boolean = true,
        revisions: List<Long> = listOf(1L, 1L),
        storedEtag: String? = null,
        onRequestEtag: (String?) -> Unit = {},
    ): DynamicWidgetServerUpdateRunner {
        val revisionQueue = ArrayDeque(revisions)

        return DynamicWidgetServerUpdateRunner(
            resolveKind = { kind },
            resolveSettings = { settings },
            currentRevision = { revisionQueue.removeFirstOrNull() ?: revisions.last() },
            readEtag = { _, _ -> storedEtag },
            fetch = { _, _, etag ->
                onRequestEtag(etag)
                result
            },
            writeEtag = { widgetScope, url, etag -> harness.etags += Triple(widgetScope.widgetId, url, etag) },
            trialRender = { _, _ -> trialRenders },
            commitProps = harness.props,
            statusStore = harness.statuses,
            notifyWidget = { harness.notified += 1 },
            now = { 1_000L },
        )
    }

    @Test
    fun `commits props that fetch, parse and render`() =
        runTest {
            val harness = Harness()
            val outcome =
                runner(
                    harness,
                    result = WidgetServerFetchResult.Success("""{"total":42}""", "\"abc\"", 200, null),
                ).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Committed, outcome)
            assertEquals(listOf("""{"total":42}"""), harness.props.committed)
            assertEquals(1, harness.statuses.successes)
            assertEquals(1, harness.notified)
        }

    @Test
    fun `stores the etag against the url it came from`() =
        runTest {
            val harness = Harness()

            runner(harness, result = WidgetServerFetchResult.Success("{}", "\"abc\"", 200, null)).run(scope).outcome

            assertEquals(
                listOf(Triple("portfolio", "https://api.example.com/portfolio", "\"abc\"")),
                harness.etags,
            )
        }

    @Test
    fun `sends the stored etag so an unchanged response costs nothing`() =
        runTest {
            var sent: String? = null

            runner(Harness(), storedEtag = "\"abc\"", onRequestEtag = { sent = it }).run(scope).outcome

            assertEquals("\"abc\"", sent)
        }

    @Test
    fun `treats 304 as fresh without touching the props`() =
        runTest {
            val harness = Harness()
            val outcome = runner(harness, result = WidgetServerFetchResult.NotModified(null)).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Committed, outcome)
            assertTrue(harness.props.committed.isEmpty())
            assertEquals(1, harness.statuses.successes)
        }

    @Test
    fun `does not commit props the widget cannot render`() =
        runTest {
            val harness = Harness()
            val outcome =
                runner(
                    harness,
                    result = WidgetServerFetchResult.Success("""{"total":42}""", null, 200, null),
                    trialRenders = false,
                ).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Failed, outcome)
            assertTrue(harness.props.committed.isEmpty())
            assertEquals(
                DynamicWidgetServerStatus.ERROR_RENDER,
                harness.statuses.failures
                    .single()
                    .first,
            )
        }

    @Test
    fun `does not commit a body that is not props, and does not ask again for it`() =
        runTest {
            val harness = Harness()
            val outcome =
                runner(
                    harness,
                    result = WidgetServerFetchResult.Success("""{"v":1,"variants":{}}""", null, 200, null),
                ).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Failed, outcome)
            assertTrue(harness.props.committed.isEmpty())
            assertEquals(
                DynamicWidgetServerStatus.ERROR_PARSE,
                harness.statuses.failures
                    .single()
                    .first,
            )
        }

    @Test
    fun `retries a network failure and keeps the previous props`() =
        runTest {
            val harness = Harness()
            val outcome = runner(harness, result = WidgetServerFetchResult.NetworkFailure("timeout")).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Retry, outcome)
            assertTrue(harness.props.committed.isEmpty())
            assertEquals(
                DynamicWidgetServerStatus.ERROR_NETWORK,
                harness.statuses.failures
                    .single()
                    .first,
            )
        }

    @Test
    fun `retries a 5xx and a 429`() =
        runTest {
            assertEquals(
                DynamicWidgetServerUpdateOutcome.Retry,
                runner(Harness(), result = WidgetServerFetchResult.HttpFailure(503, 2)).run(scope).outcome,
            )
            assertEquals(
                DynamicWidgetServerUpdateOutcome.Retry,
                runner(Harness(), result = WidgetServerFetchResult.HttpFailure(429, null)).run(scope).outcome,
            )
        }

    @Test
    fun `passes Retry-After on, clamped to what WorkManager can honour`() =
        runTest {
            val soon = runner(Harness(), result = WidgetServerFetchResult.HttpFailure(503, 2)).run(scope)
            val far = runner(Harness(), result = WidgetServerFetchResult.HttpFailure(503, 60 * 24 * 30)).run(scope)
            val none = runner(Harness(), result = WidgetServerFetchResult.HttpFailure(503, null)).run(scope)

            assertEquals(WidgetServerUpdateDefaults.MIN_INTERVAL_MINUTES, soon.nextIntervalMinutes)
            assertEquals(WidgetServerUpdateDefaults.MAX_INTERVAL_MINUTES, far.nextIntervalMinutes)
            assertNull(none.nextIntervalMinutes)
        }

    @Test
    fun `passes Cache-Control max-age on, so the server can move its own next fetch`() =
        runTest {
            val committed =
                runner(
                    Harness(),
                    result = WidgetServerFetchResult.Success("{\"total\":42}", null, 200, 360),
                ).run(scope)

            assertEquals(360L, committed.nextIntervalMinutes)
        }

    @Test
    fun `does not ask again for a body that is too large to hold`() =
        runTest {
            val harness = Harness()
            val outcome = runner(harness, result = WidgetServerFetchResult.TooLarge(200)).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Failed, outcome)
            assertTrue(harness.props.committed.isEmpty())
            assertEquals(
                DynamicWidgetServerStatus.ERROR_PARSE,
                harness.statuses.failures
                    .single()
                    .first,
            )
        }

    @Test
    fun `does not retry a 401, which stays a 401 until the app sets a new token`() =
        runTest {
            val harness = Harness()
            val outcome = runner(harness, result = WidgetServerFetchResult.HttpFailure(401, null)).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Failed, outcome)
            assertEquals(
                DynamicWidgetServerStatus.ERROR_UNAUTHORIZED to 401,
                harness.statuses.failures.single(),
            )
        }

    @Test
    fun `does not retry another 4xx, which is a misconfiguration`() =
        runTest {
            val harness = Harness()
            val outcome = runner(harness, result = WidgetServerFetchResult.HttpFailure(404, null)).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Failed, outcome)
            assertEquals(DynamicWidgetServerStatus.ERROR_HTTP to 404, harness.statuses.failures.single())
        }

    @Test
    fun `drops a result built from settings that have since changed`() =
        runTest {
            val harness = Harness()
            val outcome =
                runner(
                    harness,
                    result = WidgetServerFetchResult.Success("""{"total":42}""", null, 200, null),
                    revisions = listOf(1L, 2L),
                ).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Dropped, outcome)
            assertTrue(harness.props.committed.isEmpty())
            assertEquals(0, harness.statuses.successes)
            assertEquals(0, harness.notified)
        }

    @Test
    fun `does not fetch for a widget with no url yet`() =
        runTest {
            val harness = Harness()
            val outcome = runner(harness, settings = settings(url = null)).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Skipped, outcome)
            assertNull(harness.statuses.disabledFor)
        }

    @Test
    fun `reports disabled when the app has taken the widget over`() =
        runTest {
            val harness = Harness()
            val outcome = runner(harness, settings = settings(enabled = false)).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Skipped, outcome)
            assertEquals(scope, harness.statuses.disabledFor)
        }

    @Test
    fun `refuses to touch a widget that is no longer a Dynamic Widget`() =
        runTest {
            val harness = Harness()
            val outcome =
                runner(
                    harness,
                    kind = VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Payload),
                ).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Skipped, outcome)
            assertTrue(harness.props.committed.isEmpty())
        }

    @Test
    fun `refuses to touch a widget whose kind cannot be resolved`() =
        runTest {
            val harness = Harness()
            val outcome = runner(harness, kind = VoltraWidgetKindResolution.Unresolved("gone")).run(scope).outcome

            assertEquals(DynamicWidgetServerUpdateOutcome.Skipped, outcome)
            assertTrue(harness.props.committed.isEmpty())
        }
}
