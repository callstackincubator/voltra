package voltra.dynamicwidget

import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Cheap static guard against a repeat of the bug this package split had to fix (ADR 0000): the
 * native JNI symbol names in `voltra_js_renderer.cpp` are hand-written strings derived from
 * [VoltraJSRenderer]'s fully qualified class name (`Java_<package>_<Class>_<method>`, with `.`
 * replaced by `_`). Moving or renaming that Kotlin class without updating the `.cpp` file compiles
 * fine but fails at runtime with `UnsatisfiedLinkError`, which is swallowed into permanent
 * placeholder rendering — exactly what made issue #222 hard to diagnose. This is a plain JUnit
 * test (no Robolectric, no native library load) so it fails fast on a future package move.
 */
class VoltraJSRendererJniNamesTest {
    @Test
    fun cppJniExportNamesMatchTheKotlinClasssFullyQualifiedName() {
        val cppSource = voltraJsRendererCppSource().readText()

        val expectedPrefix = "Java_" + VoltraJSRenderer::class.java.name.replace('.', '_') + "_"

        assertTrue(
            "Expected to find JNI export '${expectedPrefix}nativeEvaluateBundle' in " +
                "voltra_js_renderer.cpp — did VoltraJSRenderer move or get renamed without " +
                "updating the JNI symbol names?",
            cppSource.contains("${expectedPrefix}nativeEvaluateBundle"),
        )
        assertTrue(
            "Expected to find JNI export '${expectedPrefix}nativeRender' in " +
                "voltra_js_renderer.cpp — did VoltraJSRenderer move or get renamed without " +
                "updating the JNI symbol names?",
            cppSource.contains("${expectedPrefix}nativeRender"),
        )
    }

    /**
     * Locates `src/main/cpp/voltra_js_renderer.cpp` relative to the module directory. Prefers the
     * `voltra.moduleDir` system property set by this module's `build.gradle` (`testOptions`) so
     * this doesn't depend on the test runner's working directory; falls back to walking up from
     * the working directory for IDE runs that don't set it.
     */
    private fun voltraJsRendererCppSource(): File {
        val relativePath = "src/main/cpp/voltra_js_renderer.cpp"

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
