package voltra.runtime

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.IOException

/**
 * Standalone Hermes runtime owned by Voltra (independent of React Native's
 * bridge). Evaluates the `@use-voltra/android-renderer` bundle once per
 * process and exposes a single `resolve()` entry point that substitutes
 * `{{ appIntent.X }}` placeholders in a widget payload at render time.
 *
 * Architectural mirror of iOS Track 2's `VoltraJSRenderer` (Swift enum).
 * Lifecycle: lazy singleton — first [ensureInitialized] call evaluates the
 * bundle; subsequent calls reuse the cached runtime for the process lifetime.
 * Thread safety: a single mutex guards both init and resolve; matches Track 2's
 * NSLock pattern.
 */
object VoltraJSRenderer {
    private const val TAG = "VoltraJSRenderer"
    private const val BUNDLE_ASSET_PATH = "voltra/android-renderer.js"

    init {
        System.loadLibrary("voltra_js_renderer")
    }

    @Volatile
    private var initialized = false
    private val lock = Any()

    private external fun nativeInit(bundleSource: String): Boolean

    private external fun nativeResolve(
        payloadJSON: String,
        paramsJSON: String,
    ): String?

    /**
     * Initialize the resolver with the JS bundle source. Idempotent — once
     * init has succeeded subsequent calls are no-ops and return true.
     *
     * Returns false if the Hermes runtime fails to load the bundle.
     */
    fun ensureInitialized(bundleSource: String): Boolean {
        if (initialized) return true
        synchronized(lock) {
            if (initialized) return true
            val t0 = System.nanoTime()
            initialized = nativeInit(bundleSource)
            val ms = (System.nanoTime() - t0) / 1_000_000.0
            if (!initialized) {
                Log.e(TAG, "Hermes init failed after ${"%.2f".format(ms)} ms")
            } else {
                Log.i(TAG, "Hermes cold-start: ${"%.2f".format(ms)} ms (bundle eval, ${bundleSource.length} chars)")
            }
            return initialized
        }
    }

    /**
     * Initialize the resolver by loading the JS bundle from the Voltra assets
     * directory (`assets/voltra/android-renderer.js`). The config plugin copies
     * the bundle there on prebuild when any widget declares `appIntent`.
     *
     * Returns false if the asset is missing (in which case reactive resolution
     * is skipped and the original payload renders unchanged).
     */
    fun ensureInitializedFromAssets(context: Context): Boolean {
        if (initialized) return true
        val t0 = System.nanoTime()
        val source =
            try {
                context.assets
                    .open(BUNDLE_ASSET_PATH)
                    .bufferedReader()
                    .use { it.readText() }
            } catch (e: IOException) {
                Log.w(TAG, "Bundle not found at assets/$BUNDLE_ASSET_PATH — reactive resolution disabled")
                return false
            }
        val readMs = (System.nanoTime() - t0) / 1_000_000.0
        Log.d(TAG, "Asset read: ${"%.2f".format(readMs)} ms (${source.length} chars)")
        return ensureInitialized(source)
    }

    /**
     * Resolve `{{ appIntent.X }}` placeholders in [payloadJSON] against
     * [appIntentParams]. Returns the resolved JSON string, or null if the
     * resolver is not initialized or the engine errors.
     */
    fun resolve(
        payloadJSON: String,
        appIntentParams: Map<String, String>,
    ): String? {
        if (!initialized) {
            Log.e(TAG, "resolve called before ensureInitialized")
            return null
        }
        val paramsJson = JSONObject()
        appIntentParams.forEach { (k, v) -> paramsJson.put(k, v) }
        val paramsJSON = paramsJson.toString()
        val t0 = System.nanoTime()
        val result =
            synchronized(lock) {
                nativeResolve(payloadJSON, paramsJSON)
            }
        val ms = (System.nanoTime() - t0) / 1_000_000.0
        Log.i(
            TAG,
            "Hermes resolve: ${"%.2f".format(ms)} ms (payload=${payloadJSON.length}c, params=${appIntentParams.size})",
        )
        return result
    }
}
