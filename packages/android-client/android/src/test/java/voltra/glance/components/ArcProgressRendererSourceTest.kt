package voltra.glance.components

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Cheap static guard over the decisions ADR 0002 made about how the arc reaches Glance.
 *
 * The arc image must be delivered as `ImageProvider(bitmap)`, not `Icon.createWithBitmap`: only
 * `Bitmap`-typed `RemoteViews` actions are counted against a widget's bitmap budget and
 * deduplicated by `RemoteViews.BitmapCache`, which is the whole reason [ArcBitmapCache] returns
 * one instance per spec. Swapping in an `Icon` compiles, renders identically in a screenshot, and
 * silently loses both properties, so nothing but a source check catches it. The neighbouring
 * `Chart` renderer takes the `Icon` route, which makes the mistake an easy one to copy.
 *
 * Composing a real Glance tree would be the stronger test, but this module has no Glance
 * composition-test dependency; this follows the same static-guard shape as
 * `VoltraJSRendererJniNamesTest`.
 */
class ArcProgressRendererSourceTest {
    /** The renderer's source with comments stripped, so prose about `Icon` cannot trip the guard. */
    private val source: String by lazy {
        arcProgressRendererSource()
            .readText()
            .replace(Regex("""/\*.*?\*/""", RegexOption.DOT_MATCHES_ALL), "")
            .replace(Regex("""//.*"""), "")
    }

    @Test
    fun deliversTheArcBitmapThroughImageProviderRatherThanAnIcon() {
        assertTrue(
            "Expected the arc Image to use ImageProvider(bitmap) so the platform counts and " +
                "deduplicates it (ADR 0002).",
            source.contains("ImageProvider(bitmap)"),
        )
        assertFalse(
            "The arc must not be delivered as an Icon: Icon-typed images are neither counted " +
                "against the widget bitmap budget nor deduplicated by RemoteViews.BitmapCache " +
                "(ADR 0002).",
            source.contains("Icon.createWithBitmap"),
        )
    }

    @Test
    fun centersTheChildrenOverAnArcThatFitsTheBox() {
        assertTrue(
            "Expected the children to be centered on top of the arc (ADR 0002).",
            source.contains("contentAlignment = Alignment.Center"),
        )
        assertTrue(
            "Expected the arc image to fill the box so it tracks the component's size.",
            source.contains("GlanceModifier.fillMaxSize()"),
        )
        assertTrue(
            "Expected ContentScale.Fit so the square bitmap is never stretched into an ellipse.",
            source.contains("contentScale = ContentScale.Fit"),
        )
        assertTrue(
            "Expected the element's children to be rendered inside the box.",
            source.contains("RenderNode(element.c)"),
        )
    }

    @Test
    fun readsTheBitmapThroughTheCacheRatherThanRenderingItDirectly() {
        assertTrue(
            "Expected the bitmap to come from ArcBitmapCache so equal specs share one instance.",
            source.contains("ArcBitmapCache.get(spec)"),
        )
        assertFalse(
            "The composable must not call renderArcBitmap directly; that bypasses the cache.",
            source.contains("renderArcBitmap("),
        )
    }

    private fun arcProgressRendererSource(): File {
        val relativePath = "src/main/java/voltra/glance/components/ArcProgressRenderers.kt"

        System.getProperty("voltra.moduleDir")?.let { moduleDir ->
            val fromProperty = File(moduleDir, relativePath)
            if (fromProperty.isFile) return fromProperty
        }

        var dir: File? = File(System.getProperty("user.dir") ?: ".").absoluteFile
        while (dir != null) {
            val candidate = File(dir, relativePath)
            if (candidate.isFile) return candidate
            dir = dir.parentFile
        }

        error(
            "Could not locate $relativePath from either the voltra.moduleDir system property " +
                "or the working directory.",
        )
    }
}
