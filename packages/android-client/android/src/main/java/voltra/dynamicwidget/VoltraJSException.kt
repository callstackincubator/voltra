package voltra.dynamicwidget

/**
 * A failure inside the standalone Hermes runtime, carrying the JavaScript message and stack that
 * used to be lost in a C++ log line (ADR 0013).
 *
 * `voltra_js_renderer.cpp` constructs this class by name, with the `(String, String?)`
 * constructor, when a bundle fails to evaluate or `render()` throws or returns something other
 * than a string. The name and constructor are therefore a JNI contract, kept from R8 by
 * `consumer-rules.pro` and pinned by `VoltraJSRendererJniNamesTest`.
 */
internal class VoltraJSException(
    message: String,
    val jsStack: String?,
) : RuntimeException(message)
