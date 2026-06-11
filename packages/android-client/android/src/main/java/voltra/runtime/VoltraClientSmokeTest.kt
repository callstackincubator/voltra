package voltra.runtime

import android.content.Context
import android.util.Log

/**
 * Phase 0 smoke test — Track 5 (client-rendered widgets) on Android.
 *
 * Proves the genuine unknown that Track 4 never exercised: that a **full** widget bundle
 * (React + the `@use-voltra/android` renderer, serialized by the widget Metro config with no
 * RN preamble) evaluates in a bare standalone Hermes runtime and that `render(props, env)`
 * returns a Voltra node-tree JSON string.
 *
 * Reads a pre-built fixture bundle from `assets/voltra/smoke-widget.bundle` (produced by
 * `example/metro/buildSmokeBundle.cjs`), evaluates it, and renders once with a synthetic env.
 * Logs to logcat under tag "VoltraClientSmoke".
 *
 * Gate: a "SMOKE PASSED" log line with a JSON payload. If it logs "FAIL" / "fixture not
 * found", investigate before proceeding to Phase 1.
 *
 * Throwaway file — delete when Phase 3 wires the real client widget path.
 */
object VoltraClientSmokeTest {
    private const val TAG = "VoltraClientSmoke"
    private const val BUNDLE_ASSET = "voltra/smoke-widget.bundle"
    private const val WIDGET_ID = "SmokeClientWidget"

    fun run(context: Context) {
        try {
            val source =
                try {
                    context.assets
                        .open(BUNDLE_ASSET)
                        .bufferedReader()
                        .use { it.readText() }
                } catch (e: Exception) {
                    Log.e(
                        TAG,
                        "fixture not found at assets/$BUNDLE_ASSET — run `node example/metro/buildSmokeBundle.cjs` and rebuild",
                        e,
                    )
                    return
                }
            Log.i(TAG, "fixture read: ${source.length} chars")

            val t0 = System.nanoTime()
            val evaluated = VoltraJSRenderer.evaluateBundle(source, WIDGET_ID)
            val evalMs = (System.nanoTime() - t0) / 1_000_000.0
            if (!evaluated) {
                Log.e(TAG, "FAIL: evaluateBundle returned false (eval ${"%.2f".format(evalMs)} ms)")
                return
            }
            Log.i(TAG, "evaluateBundle OK in ${"%.2f".format(evalMs)} ms")

            val envJSON =
                """
                {"date":${System.currentTimeMillis()},"widgetFamily":"200x200","colorScheme":"dark",""" +
                    """"locale":"en-US","build":{"isDev":true,"metroUrl":null,"appVersion":"0.0.0","voltraVersion":"1.4.1"}}"""

            val t1 = System.nanoTime()
            val json = VoltraJSRenderer.render(WIDGET_ID, "{}", envJSON)
            val renderMs = (System.nanoTime() - t1) / 1_000_000.0
            if (json == null) {
                Log.e(TAG, "FAIL: render returned null")
                return
            }
            Log.i(TAG, "render OK in ${"%.2f".format(renderMs)} ms, ${json.length} chars")
            Log.i(TAG, "RESULT: ${json.take(600)}")
            Log.i(TAG, "SMOKE PASSED")
        } catch (t: Throwable) {
            Log.e(TAG, "smoke threw", t)
        }
    }
}
