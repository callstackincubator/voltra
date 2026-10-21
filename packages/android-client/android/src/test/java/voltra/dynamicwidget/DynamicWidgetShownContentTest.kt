package voltra.dynamicwidget

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowLog
import voltra.models.VoltraNode
import java.io.File

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetShownContentTest {
    @After
    fun resetLog() {
        DynamicWidgetFailureLog.reset()
        ShadowLog.clear()
    }

    private val live = VoltraNode.Text("live")
    private val lastGood = VoltraNode.Text("last good")
    private val placeholder = VoltraNode.Text("placeholder")
    private val success = DynamicWidgetRenderOutcome.Success(live, """{"t":18,"c":"live"}""")
    private val failure =
        DynamicWidgetRenderOutcome.Failure(
            DynamicWidgetRenderOutcome.Stage.Render,
            "TypeError: Cannot read property 'map' of undefined",
            "TypeError: x\n    at InboxWidget (a.tsx:31:22)\n    at render (b.js:1:1)",
        )

    private fun choose(
        dev: Boolean,
        outcome: DynamicWidgetRenderOutcome,
        withLastGood: Boolean = true,
        withPlaceholder: Boolean = true,
    ) = chooseDynamicWidgetContent(
        isDev = dev,
        outcome = outcome,
        lastGood = { if (withLastGood) lastGood else null },
        placeholder = { if (withPlaceholder) placeholder else null },
    )

    @Test
    fun aSuccessfulRenderIsShownInDevAndRelease() {
        for (dev in listOf(true, false)) {
            val shown = choose(dev, success) as DynamicWidgetShownContent.Node
            assertSame(live, shown.node)
        }
    }

    @Test
    fun aSuccessfulRenderDoesNotTouchTheLastGoodStoreOrThePlaceholder() {
        chooseDynamicWidgetContent(
            isDev = false,
            outcome = success,
            lastGood = { error("read the last good render") },
            placeholder = { error("decoded the placeholder") },
        )
    }

    @Test
    fun devShowsTheErrorViewEvenWhenALastGoodRenderAndAPlaceholderExist() {
        assertEquals(DynamicWidgetShownContent.DevError(failure), choose(dev = true, outcome = failure))
    }

    @Test
    fun devShowsTheErrorViewWithNothingToFallBackOn() {
        assertEquals(
            DynamicWidgetShownContent.DevError(failure),
            choose(dev = true, outcome = failure, withLastGood = false, withPlaceholder = false),
        )
    }

    @Test
    fun releaseKeepsTheLastGoodRenderOverThePlaceholder() {
        val shown = choose(dev = false, outcome = failure) as DynamicWidgetShownContent.Node

        assertSame(lastGood, shown.node)
    }

    @Test
    fun releaseFallsBackToThePlaceholderWithoutALastGoodRender() {
        val shown = choose(dev = false, outcome = failure, withLastGood = false) as DynamicWidgetShownContent.Node

        assertSame(placeholder, shown.node)
    }

    @Test
    fun releaseFallsBackToLoadingWithNeither() {
        assertEquals(
            DynamicWidgetShownContent.Loading,
            choose(dev = false, outcome = failure, withLastGood = false, withPlaceholder = false),
        )
    }

    @Test
    fun releaseNeverShowsTheErrorView() {
        for (withLastGood in listOf(true, false)) {
            for (withPlaceholder in listOf(true, false)) {
                assertFalse(
                    choose(false, failure, withLastGood, withPlaceholder) is DynamicWidgetShownContent.DevError,
                )
            }
        }
    }

    @Test
    fun keepsAtMostSixStackFramesAndDropsTheMessageLine() {
        val stack = "Error: boom\n" + (1..9).joinToString("\n") { "    at frame$it (f.js:$it:1)" }

        val frames = devErrorStackFrames(stack)

        assertEquals(6, frames.size)
        assertEquals("at frame1 (f.js:1:1)", frames.first())
        assertEquals("at frame6 (f.js:6:1)", frames.last())
    }

    @Test
    fun aMissingOrFramelessStackHasNoFrames() {
        assertEquals(emptyList<String>(), devErrorStackFrames(null))
        assertEquals(emptyList<String>(), devErrorStackFrames("Error: boom"))
    }

    @Test
    fun theFailureLineMatchesTheDocumentedShape() {
        assertEquals(
            "render failed widgetId=inbox appWidgetId=42 stage=render dev=true: " +
                "TypeError: Cannot read property 'map' of undefined",
            DynamicWidgetFailureLog.failureLine("inbox", 42, failure, dev = true),
        )
    }

    @Test
    fun logsOneErrorUnderTheDynamicWidgetTagWithTheStackOnlyInDev() {
        DynamicWidgetFailureLog.failed("inbox", 42, failure, dev = true)
        DynamicWidgetFailureLog.failed("inbox", 42, failure, dev = false)

        val errors = ShadowLog.getLogsForTag("VoltraDynamicWidget").filter { it.type == android.util.Log.ERROR }
        assertEquals(2, errors.size)
        assertTrue(errors[0].msg.contains("at InboxWidget (a.tsx:31:22)"))
        assertFalse(errors[1].msg.contains("InboxWidget"))
    }

    @Test
    fun logsOneRecoveryAfterAFailureAndNoneOtherwise() {
        DynamicWidgetFailureLog.succeeded("inbox", 42)
        DynamicWidgetFailureLog.failed("inbox", 42, failure, dev = false)
        DynamicWidgetFailureLog.succeeded("inbox", 42)
        DynamicWidgetFailureLog.succeeded("inbox", 42)

        val infos = ShadowLog.getLogsForTag("VoltraDynamicWidget").filter { it.type == android.util.Log.INFO }
        assertEquals(listOf("render recovered widgetId=inbox appWidgetId=42"), infos.map { it.msg })
    }

    @Test
    fun aRecoveryIsTrackedPerPlacement() {
        DynamicWidgetFailureLog.failed("inbox", 1, failure, dev = false)

        DynamicWidgetFailureLog.succeeded("inbox", 2)

        assertTrue(ShadowLog.getLogsForTag("VoltraDynamicWidget").none { it.type == android.util.Log.INFO })
    }

    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private val store get() = DynamicWidgetLastGoodStore(File(temporaryFolder.root, "last-good"))

    private fun parse(json: String): VoltraNode? = if (json == lastGoodJson) lastGood else null

    private val lastGoodJson = """{"t":18,"c":"last good"}"""

    private fun resolve(
        dev: Boolean,
        bundleState: DynamicWidgetBundleState,
        appWidgetId: Int? = 7,
        render: () -> DynamicWidgetRenderOutcome = { success },
        widgetId: String = "resolve",
    ) = resolveDynamicWidgetContent(
        widgetId = widgetId,
        appWidgetId = appWidgetId,
        isDev = dev,
        bundleState = bundleState,
        render = render,
        lastGoodStore = store,
        parseNode = ::parse,
        placeholder = { placeholder },
    )

    @Test
    fun aReadyBundleIsRenderedAndShown() {
        var rendered = 0

        val shown =
            resolve(dev = false, bundleState = DynamicWidgetBundleState.Ready, render = {
                rendered++
                success
            })

        assertEquals(1, rendered)
        assertSame(live, (shown as DynamicWidgetShownContent.Node).node)
    }

    @Test
    fun aFailedBundleIsNotRenderedAndIsShownAsTheDevErrorInDev() {
        val bundleFailure =
            DynamicWidgetRenderOutcome.Failure(
                DynamicWidgetRenderOutcome.Stage.Bundle,
                "Metro down",
                null,
            )

        val shown =
            resolve(dev = true, bundleState = DynamicWidgetBundleState.Failed(bundleFailure), render = {
                error("rendered despite a failed bundle")
            })

        assertEquals(DynamicWidgetShownContent.DevError(bundleFailure), shown)
    }

    @Test
    fun aSuccessfulRenderIsWrittenAsTheLastGoodRenderInEveryBuild() {
        for (dev in listOf(true, false)) {
            val widgetId = "resolve-write-$dev"

            resolve(dev, DynamicWidgetBundleState.Ready, appWidgetId = 7, widgetId = widgetId)

            assertEquals(success.nodeJson, store.read(widgetId, 7))
        }
    }

    @Test
    fun aSuccessWithoutAnAppWidgetIdWritesNothing() {
        resolve(
            dev = false,
            bundleState = DynamicWidgetBundleState.Ready,
            appWidgetId = null,
            widgetId = "resolve-no-id",
        )

        assertEquals(emptySet<Int>(), store.storedAppWidgetIds("resolve-no-id"))
    }

    @Test
    fun aFailureIsLoggedOnceAndAfterwardsARecoveryIs() {
        resolve(
            dev = false,
            bundleState = DynamicWidgetBundleState.Ready,
            render = { failure },
            widgetId = "resolve-log",
        )
        resolve(dev = false, bundleState = DynamicWidgetBundleState.Ready, widgetId = "resolve-log")

        val logs = ShadowLog.getLogsForTag("VoltraDynamicWidget")
        assertEquals(listOf(android.util.Log.ERROR, android.util.Log.INFO), logs.map { it.type })
        assertTrue(logs[0].msg.startsWith("render failed widgetId=resolve-log appWidgetId=7 stage=render dev=false"))
    }

    @Test
    fun aReleaseFailureShowsTheStoredLastGoodRender() {
        store.write("resolve-release", 7, lastGoodJson)

        val shown =
            resolve(
                dev = false,
                bundleState = DynamicWidgetBundleState.Ready,
                render = { failure },
                widgetId = "resolve-release",
            )

        assertSame(lastGood, (shown as DynamicWidgetShownContent.Node).node)
    }

    @Test
    fun aReleaseFailureWithoutAnAppWidgetIdIgnoresTheStoredRenderAndShowsThePlaceholder() {
        store.write("resolve-release-no-id", 7, lastGoodJson)

        val shown =
            resolve(
                dev = false,
                bundleState = DynamicWidgetBundleState.Ready,
                appWidgetId = null,
                render = { failure },
                widgetId = "resolve-release-no-id",
            )

        assertSame(placeholder, (shown as DynamicWidgetShownContent.Node).node)
    }

    @Test
    fun aDevFailureShowsTheErrorViewEvenWithAStoredLastGoodRender() {
        store.write("resolve-dev", 7, lastGoodJson)

        val shown =
            resolve(
                dev = true,
                bundleState = DynamicWidgetBundleState.Ready,
                render = { failure },
                widgetId = "resolve-dev",
            )

        assertEquals(DynamicWidgetShownContent.DevError(failure), shown)
    }
}
