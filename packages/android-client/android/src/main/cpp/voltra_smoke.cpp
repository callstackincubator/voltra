// Phase 0 — Hermes-on-Android smoke test (Track 4)
//
// Validates that:
//   1. Voltra's android-client AAR can carry native code
//   2. Hermes headers + libhermes.so are linkable from a Voltra-owned target
//   3. `hermes::makeHermesRuntime()` works outside the React Native bridge
//
// Throwaway file: delete before merging if the broader PoC fails.

#include <jni.h>
#include <android/log.h>

#include <hermes/hermes.h>
#include <jsi/jsi.h>

#include <memory>
#include <string>

#define LOG_TAG "VoltraSmokeTest"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace jsi = facebook::jsi;

extern "C" JNIEXPORT jstring JNICALL
Java_voltra_runtime_VoltraSmokeTest_runSmokeTestNative(JNIEnv *env, jobject /* this */) {
  try {
    LOGI("creating standalone Hermes runtime...");
    auto runtime = facebook::hermes::makeHermesRuntime();

    LOGI("evaluating `1 + 1`...");
    jsi::Value result = runtime->evaluateJavaScript(
        std::make_unique<jsi::StringBuffer>("1 + 1"),
        "voltra-smoke.js");

    const double n = result.asNumber();
    LOGI("result: %f", n);

    const std::string out = "Hermes OK: 1 + 1 = " + std::to_string(static_cast<int>(n));
    return env->NewStringUTF(out.c_str());
  } catch (const std::exception &e) {
    LOGE("smoke test threw: %s", e.what());
    const std::string out = std::string("Hermes FAIL: ") + e.what();
    return env->NewStringUTF(out.c_str());
  } catch (...) {
    LOGE("smoke test threw unknown");
    return env->NewStringUTF("Hermes FAIL: unknown exception");
  }
}