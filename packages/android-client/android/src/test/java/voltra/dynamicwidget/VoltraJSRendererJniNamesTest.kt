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
     * The native code throws [VoltraJSException] by name (ADR 0013). Renaming or moving the class
     * compiles, and then every JS failure becomes a `NoClassDefFoundError` inside the JNI call; R8
     * stripping its constructor does the same in an app that minifies. This pins all three places
     * that have to agree: the class, the `FindClass` string, and the consumer keep rule.
     */
    @Test
    fun theJsExceptionClassIsFoundByNativeCodeAndKeptByTheConsumerRules() {
        val cppSource = voltraJsRendererCppSource().readText()
        val internalName = VoltraJSException::class.java.name.replace('.', '/')

        assertTrue(
            "voltra_js_renderer.cpp must FindClass(\"$internalName\")",
            cppSource.contains("FindClass(\"$internalName\")"),
        )
        assertTrue(
            "voltra_js_renderer.cpp must construct it with (String, String)",
            cppSource.contains("\"(Ljava/lang/String;Ljava/lang/String;)V\""),
        )
        VoltraJSException::class.java.getConstructor(String::class.java, String::class.java)

        val rules =
            File(
                voltraJsRendererCppSource()
                    .parentFile.parentFile.parentFile.parentFile,
                "consumer-rules.pro",
            )
        assertTrue("consumer-rules.pro must exist at ${rules.path}", rules.isFile)
        val rulesText = rules.readText()
        assertTrue(rulesText.contains("-keep class ${VoltraJSException::class.java.name}"))
        assertTrue(rulesText.contains("<init>(java.lang.String, java.lang.String)"))
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
