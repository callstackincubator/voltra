package voltra.glance.components

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Static guard over how Column and Row apply the `gap` style.
 *
 * Glance keeps only the first 10 direct children of a Column/Row and drops the rest. The gap
 * must therefore be padding on a wrapper around each child, never a `Spacer` view between
 * children: a spacer would use up a slot, so a Column with 6 children and a gap would lose
 * its sixth child. Both approaches compile and look the same for short lists, so only a
 * source check catches the regression. This module has no Glance composition-test
 * dependency; this follows the same static-guard shape as `ArcProgressRendererSourceTest`.
 */
class LayoutRenderersGapSourceTest {
    private val source: String by lazy {
        layoutRenderersSource()
            .readText()
            .replace(Regex("""/\*.*?\*/""", RegexOption.DOT_MATCHES_ALL), "")
            .replace(Regex("""//.*"""), "")
    }

    @Test
    fun onlyTheSpacerComponentEmitsASpacerView() {
        assertEquals(
            "Only RenderSpacer may emit a Glance Spacer; a gap spacer uses up one of the 10 " +
                "direct children Glance keeps in a Column/Row.",
            1,
            Regex("""\bSpacer\(""").findAll(source).count(),
        )
    }

    @Test
    fun columnAndRowWrapChildrenInGapPadding() {
        assertTrue(
            "Expected Column to apply the gap as vertical padding on a wrapper.",
            source.contains("GlanceModifier.padding(top = insets.leading, bottom = insets.trailing)"),
        )
        assertTrue(
            "Expected Row to apply the gap as start/end padding on a wrapper.",
            source.contains("GlanceModifier.padding(start = insets.leading, end = insets.trailing)"),
        )
    }

    private fun layoutRenderersSource(): File {
        val relativePath = "src/main/java/voltra/glance/components/LayoutRenderers.kt"

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
