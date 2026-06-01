// Voltra JS Renderer — Hermes-on-Android JNI wrapper (Track 4).
//
// Owns a single standalone Hermes runtime per process. The runtime evaluates
// the @use-voltra/android-renderer bundle once on first init, after which
// `nativeResolve` invokes `globalThis.VoltraRenderer.resolve(payload, params)`
// to substitute `{{ appIntent.X }}` placeholders in a widget payload.
//
// Architectural mirror of iOS Track 2's VoltraJSRenderer.swift, one layer
// lower at the JNI boundary because Android has no Kotlin/Java Hermes API.

#include <jni.h>
#include <android/log.h>

#include <hermes/hermes.h>
#include <jsi/jsi.h>

#include <memory>
#include <mutex>
#include <string>

#define LOG_TAG "VoltraJSRenderer"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace jsi = facebook::jsi;

namespace {

struct State {
  std::unique_ptr<jsi::Runtime> runtime;
};

std::mutex g_mutex;
std::unique_ptr<State> g_state;

std::string jstringToStd(JNIEnv *env, jstring jstr) {
  if (jstr == nullptr) {
    return {};
  }
  const char *chars = env->GetStringUTFChars(jstr, nullptr);
  std::string out(chars);
  env->ReleaseStringUTFChars(jstr, chars);
  return out;
}

} // namespace

extern "C" JNIEXPORT jboolean JNICALL
Java_voltra_runtime_VoltraJSRenderer_nativeInit(
    JNIEnv *env, jobject /* this */, jstring jBundleSource) {
  std::lock_guard<std::mutex> lock(g_mutex);
  try {
    const std::string bundleSource = jstringToStd(env, jBundleSource);

    auto runtime = facebook::hermes::makeHermesRuntime();
    runtime->evaluateJavaScript(
        std::make_unique<jsi::StringBuffer>(bundleSource),
        "@use-voltra/android-renderer");

    // Sanity-check that the bundle exposed VoltraRenderer.resolve.
    auto renderer =
        runtime->global().getProperty(*runtime, "VoltraRenderer");
    if (!renderer.isObject()) {
      LOGE("init: bundle did not define globalThis.VoltraRenderer");
      return JNI_FALSE;
    }
    auto resolve = renderer.asObject(*runtime).getProperty(*runtime, "resolve");
    if (!resolve.isObject() ||
        !resolve.asObject(*runtime).isFunction(*runtime)) {
      LOGE("init: VoltraRenderer.resolve is not a function");
      return JNI_FALSE;
    }

    g_state = std::make_unique<State>();
    g_state->runtime = std::move(runtime);
    LOGI("Hermes runtime initialized");
    return JNI_TRUE;
  } catch (const std::exception &e) {
    LOGE("init failed: %s", e.what());
    return JNI_FALSE;
  } catch (...) {
    LOGE("init failed: unknown");
    return JNI_FALSE;
  }
}

extern "C" JNIEXPORT jstring JNICALL
Java_voltra_runtime_VoltraJSRenderer_nativeResolve(
    JNIEnv *env, jobject /* this */, jstring jPayloadJSON,
    jstring jParamsJSON) {
  std::lock_guard<std::mutex> lock(g_mutex);
  if (!g_state || !g_state->runtime) {
    LOGE("resolve called before init");
    return nullptr;
  }
  try {
    auto &rt = *g_state->runtime;
    const std::string payloadJSON = jstringToStd(env, jPayloadJSON);
    const std::string paramsJSON = jstringToStd(env, jParamsJSON);

    auto json = rt.global().getPropertyAsObject(rt, "JSON");
    auto parse = json.getPropertyAsFunction(rt, "parse");
    auto stringify = json.getPropertyAsFunction(rt, "stringify");

    jsi::Value payloadVal = parse.call(
        rt, jsi::String::createFromUtf8(rt, payloadJSON));
    jsi::Value paramsVal = parse.call(
        rt, jsi::String::createFromUtf8(rt, paramsJSON));

    auto renderer = rt.global().getPropertyAsObject(rt, "VoltraRenderer");
    auto resolve = renderer.getPropertyAsFunction(rt, "resolve");

    jsi::Value result =
        resolve.call(rt, std::move(payloadVal), std::move(paramsVal));

    jsi::Value stringified = stringify.call(rt, std::move(result));
    if (!stringified.isString()) {
      LOGE("resolve: stringify did not return a string");
      return nullptr;
    }
    std::string resultStr = stringified.asString(rt).utf8(rt);
    return env->NewStringUTF(resultStr.c_str());
  } catch (const std::exception &e) {
    LOGE("resolve threw: %s", e.what());
    return nullptr;
  } catch (...) {
    LOGE("resolve threw: unknown");
    return nullptr;
  }
}