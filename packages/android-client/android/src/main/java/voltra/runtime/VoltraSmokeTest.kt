package voltra.runtime

import android.util.Log

/**
 * Phase 0 — Hermes-on-Android smoke test (Track 4).
 *
 * Validates that a standalone Hermes runtime can be instantiated from Kotlin via JNI.
 * Calls into `libvoltra_smoke.so` which creates a runtime, evaluates `1 + 1`, and
 * returns the result as a string.
 *
 * If [run] logs "Hermes OK: 1 + 1 = 2", the PoC gate has passed and we proceed to Phase 1.
 * If it logs "Hermes FAIL: ...", investigate the linker/ABI error or fall back to QuickJS.
 *
 * Throwaway file — delete before merging if the broader PoC fails.
 */
object VoltraSmokeTest {
    private const val TAG = "VoltraSmokeTest"

    init {
        System.loadLibrary("voltra_smoke")
    }

    private external fun runSmokeTestNative(): String

    fun run() {
        try {
            val result = runSmokeTestNative()
            Log.i(TAG, result)
        } catch (e: Throwable) {
            Log.e(TAG, "smoke test threw on the JNI boundary", e)
        }
    }
}
