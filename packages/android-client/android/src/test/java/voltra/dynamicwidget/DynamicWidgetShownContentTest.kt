package voltra.dynamicwidget

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
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

    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private val store get() = DynamicWidgetLastGoodStore(File(temporaryFolder.root, "last-good"))

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
    private val lastGoodJson = """{"t":18,"c":"last good"}"""
    private val family = "180x110"

    private fun parse(json: String): VoltraNode? = if (json == lastGoodJson) lastGood else null

    private fun resolve(
        dev: Boolean,
        bundleState: DynamicWidgetBundleState = DynamicWidgetBundleState.Ready,
        appWidgetId: Int? = 7,
        render: () -> DynamicWidgetRenderOutcome = { success },
        widgetId: String = "resolve",
        family: String = this.family,
        placeholder: () -> VoltraNode? = { this.placeholder },
        lastGoodStore: DynamicWidgetLastGoodStore = store,
    ) = resolveDynamicWidgetContent(
        widgetId = widgetId,
        appWidgetId = appWidgetId,
        family = family,
        isDev = dev,
        bundleState = bundleState,
        render = render,
        lastGoodStore = lastGoodStore,
        parseNode = ::parse,
        placeholder = placeholder,
    )

    @Test
    fun aSuccessfulRenderIsShownInDevAndRelease() {
        for (dev in listOf(true, false)) {
            val shown = resolve(dev) as DynamicWidgetShownContent.Node
            assertSame(live, shown.node)
        }
    }

    @Test
    fun aSuccessfulRenderDoesNotDecodeThePlaceholder() {
        resolve(dev = false, placeholder = { error("decoded the placeholder") })
    }

    @Test
    fun devShowsTheErrorViewEvenWhenALastGoodRenderAndAPlaceholderExist() {
        store.write("resolve", 7, family, lastGoodJson)

        assertEquals(DynamicWidgetShownContent.DevError(failure), resolve(dev = true, render = { failure }))
    }

    @Test
    fun devShowsTheErrorViewWithNothingToFallBackOn() {
        assertEquals(
            DynamicWidgetShownContent.DevError(failure),
            resolve(dev = true, render = { failure }, placeholder = { null }),
        )
    }

    @Test
    fun releaseKeepsTheLastGoodRenderOverThePlaceholder() {
        store.write("resolve", 7, family, lastGoodJson)

        val shown = resolve(dev = false, render = { failure }) as DynamicWidgetShownContent.Node

        assertSame(lastGood, shown.node)
    }

    @Test
    fun releaseFallsBackToThePlaceholderWithoutALastGoodRender() {
        val shown = resolve(dev = false, render = { failure }) as DynamicWidgetShownContent.Node

        assertSame(placeholder, shown.node)
    }

    @Test
    fun releaseFallsBackToLoadingWithNeither() {
        assertEquals(
            DynamicWidgetShownContent.Loading,
            resolve(dev = false, render = { failure }, placeholder = { null }),
        )
    }

    @Test
    fun releaseNeverShowsTheErrorView() {
        for (stored in listOf(true, false)) {
            for (withPlaceholder in listOf(true, false)) {
                if (stored) store.write("resolve", 7, family, lastGoodJson)

                val shown =
                    resolve(
                        dev = false,
                        render = { failure },
                        placeholder = { if (withPlaceholder) placeholder else null },
                    )

                assertFalse(shown is DynamicWidgetShownContent.DevError)
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
            "render failed widgetId=inbox appWidgetId=42 family=180x110 stage=render dev=true: " +
                "TypeError: Cannot read property 'map' of undefined",
            DynamicWidgetFailureLog.failureLine("inbox", 42, family, failure, dev = true),
        )
    }

    @Test
    fun logsOneErrorUnderTheDynamicWidgetTagWithTheStackOnlyInDev() {
        DynamicWidgetFailureLog.failed("inbox", 42, family, failure, dev = true)
        DynamicWidgetFailureLog.failed("inbox", 42, family, failure, dev = false)

        val errors = ShadowLog.getLogsForTag("VoltraDynamicWidget").filter { it.type == android.util.Log.ERROR }
        assertEquals(2, errors.size)
        assertTrue(errors[0].msg.contains("at InboxWidget (a.tsx:31:22)"))
        assertFalse(errors[1].msg.contains("InboxWidget"))
    }

    @Test
    fun logsOneRecoveryAfterAFailureAndNoneOtherwise() {
        DynamicWidgetFailureLog.succeeded("inbox", 42, family)
        DynamicWidgetFailureLog.failed("inbox", 42, family, failure, dev = false)
        DynamicWidgetFailureLog.succeeded("inbox", 42, family)
        DynamicWidgetFailureLog.succeeded("inbox", 42, family)

        val infos = ShadowLog.getLogsForTag("VoltraDynamicWidget").filter { it.type == android.util.Log.INFO }
        assertEquals(listOf("render recovered widgetId=inbox appWidgetId=42 family=180x110"), infos.map { it.msg })
    }

    @Test
    fun aRecoveryIsTrackedPerPlacementAndSize() {
        DynamicWidgetFailureLog.failed("inbox", 1, family, failure, dev = false)

        DynamicWidgetFailureLog.succeeded("inbox", 2, family)
        DynamicWidgetFailureLog.succeeded("inbox", 1, "360x220")

        assertTrue(ShadowLog.getLogsForTag("VoltraDynamicWidget").none { it.type == android.util.Log.INFO })
    }

    @Test
    fun aReadyBundleIsRenderedAndShown() {
        var rendered = 0

        val shown =
            resolve(dev = false, render = {
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

            resolve(dev, widgetId = widgetId)

            assertEquals(success.nodeJson, store.read(widgetId, 7, family))
        }
    }

    @Test
    fun aSuccessWithoutAnAppWidgetIdWritesNothing() {
        resolve(dev = false, appWidgetId = null, widgetId = "resolve-no-id")

        assertEquals(emptySet<Int>(), store.storedAppWidgetIds("resolve-no-id"))
    }

    @Test
    fun aFailureIsLoggedOnceAndAfterwardsARecoveryIs() {
        resolve(dev = false, render = { failure }, widgetId = "resolve-log")
        resolve(dev = false, widgetId = "resolve-log")

        val logs = ShadowLog.getLogsForTag("VoltraDynamicWidget")
        assertEquals(listOf(android.util.Log.ERROR, android.util.Log.INFO), logs.map { it.type })
        assertTrue(
            logs[0].msg.startsWith(
                "render failed widgetId=resolve-log appWidgetId=7 family=180x110 stage=render dev=false",
            ),
        )
    }

    @Test
    fun aReleaseFailureWithoutAnAppWidgetIdIgnoresTheStoredRenderAndShowsThePlaceholder() {
        store.write("resolve-release-no-id", 7, family, lastGoodJson)

        val shown =
            resolve(
                dev = false,
                appWidgetId = null,
                render = { failure },
                widgetId = "resolve-release-no-id",
            )

        assertSame(placeholder, (shown as DynamicWidgetShownContent.Node).node)
    }

    // Glance composes `Content` once per size a placement reports (`SizeMode.Exact`), so these run
    // two sizes of one placement through the same store, in the order Glance composes them.

    private val smallNode = VoltraNode.Text("small")
    private val largeNode = VoltraNode.Text("large")
    private val smallJson = """{"t":18,"c":"small"}"""
    private val largeJson = """{"t":18,"c":"large"}"""

    private fun parseSized(json: String): VoltraNode? =
        when (json) {
            smallJson -> smallNode
            largeJson -> largeNode
            else -> null
        }

    private fun resolveSized(
        family: String,
        render: () -> DynamicWidgetRenderOutcome,
        store: DynamicWidgetLastGoodStore,
    ) = resolveDynamicWidgetContent(
        widgetId = "sized",
        appWidgetId = 7,
        family = family,
        isDev = false,
        bundleState = DynamicWidgetBundleState.Ready,
        render = render,
        lastGoodStore = store,
        parseNode = ::parseSized,
        placeholder = { placeholder },
    )

    private fun rendered(
        node: VoltraNode,
        json: String,
    ) = DynamicWidgetRenderOutcome.Success(node, json)

    @Test
    fun aFailingSizeShowsItsOwnLastGoodRenderNotTheOtherSizes() {
        val store = store
        resolveSized("180x110", { rendered(smallNode, smallJson) }, store)
        resolveSized("360x220", { rendered(largeNode, largeJson) }, store)

        val small = resolveSized("180x110", { failure }, store) as DynamicWidgetShownContent.Node
        val large = resolveSized("360x220", { failure }, store) as DynamicWidgetShownContent.Node

        assertSame(smallNode, small.node)
        assertSame(largeNode, large.node)
    }

    @Test
    fun aSizeThatNeverRenderedFallsBackToThePlaceholderRatherThanAnotherSize() {
        val store = store
        resolveSized("180x110", { rendered(smallNode, smallJson) }, store)

        val shown = resolveSized("360x220", { failure }, store) as DynamicWidgetShownContent.Node

        assertSame(placeholder, shown.node)
    }

    @Test
    fun twoSizesWithTheSameOutputsWriteOnlyOnceEach() {
        val store = store
        val directory = File(temporaryFolder.root, "last-good")
        resolveSized("180x110", { rendered(smallNode, smallJson) }, store)
        resolveSized("360x220", { rendered(largeNode, largeJson) }, store)
        val files = directory.listFiles()!!.sortedBy { it.name }
        files.forEach { it.setLastModified(1_000L) }

        // Another round of the two compositions: nothing is rewritten.
        resolveSized("180x110", { rendered(smallNode, smallJson) }, store)
        resolveSized("360x220", { rendered(largeNode, largeJson) }, store)

        assertEquals(2, files.size)
        assertTrue(directory.listFiles()!!.all { it.lastModified() == 1_000L })
    }

    @Test
    fun aFailureAtOneSizeNeverLogsARecoveryForTheOtherSizesSuccess() {
        val store = store
        repeat(3) {
            resolveSized("180x110", { rendered(smallNode, smallJson) }, store)
            resolveSized("360x220", { failure }, store)
        }

        val logs = ShadowLog.getLogsForTag("VoltraDynamicWidget")
        assertEquals(3, logs.size)
        assertTrue(logs.all { it.type == android.util.Log.ERROR })
        assertNull(logs.firstOrNull { it.type == android.util.Log.INFO })
    }
}
