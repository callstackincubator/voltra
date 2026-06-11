// Voltra JS Renderer — Hermes-on-Android JNI wrapper for client-rendered widgets.
//
// Owns a single standalone Hermes runtime per process, independent of the React
// Native bridge. Each per-widget Metro bundle is evaluated once; the evaluation
// captures the bundle's `render(props, env)` export under
// `globalThis.__voltraWidgets[<widgetId>]` (the capture bootstrap is appended on
// the Kotlin side, mirroring iOS `VoltraJSRenderer.swift`). `nativeRender` then
// invokes that function on every Glance render.
//
// Architectural mirror of iOS's VoltraJSRenderer.swift (JSC), one layer lower at
// the JNI boundary because Android has no Kotlin/Java Hermes API.

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

std::mutex g_mutex;
std::unique_ptr<jsi::Runtime> g_runtime;

jsi::Runtime &runtime() {
  if (!g_runtime) {
    g_runtime = facebook::hermes::makeHermesRuntime();
    LOGI("standalone Hermes runtime created");
  }
  return *g_runtime;
}

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

// Evaluate a (Kotlin-wrapped) widget bundle and verify the capture bootstrap
// registered `globalThis.__voltraWidgets[<widgetId>].render`. Returns false on
// any JS error or if the render function was not captured.
extern "C" JNIEXPORT jboolean JNICALL
Java_voltra_runtime_VoltraJSRenderer_nativeEvaluateBundle(
    JNIEnv *env, jobject /* this */, jstring jWrappedSource, jstring jSourceURL,
    jstring jWidgetId) {
  std::lock_guard<std::mutex> lock(g_mutex);
  try {
    const std::string source = jstringToStd(env, jWrappedSource);
    const std::string sourceURL = jstringToStd(env, jSourceURL);
    const std::string widgetId = jstringToStd(env, jWidgetId);

    auto &rt = runtime();
    rt.evaluateJavaScript(
        std::make_unique<jsi::StringBuffer>(source), sourceURL);

    auto registry = rt.global().getProperty(rt, "__voltraWidgets");
    if (!registry.isObject()) {
      LOGE("evaluateBundle: globalThis.__voltraWidgets missing after eval");
      return JNI_FALSE;
    }
    auto widget = registry.asObject(rt).getProperty(rt, widgetId.c_str());
    if (!widget.isObject()) {
      LOGE("evaluateBundle: no entry for widgetId=%s", widgetId.c_str());
      return JNI_FALSE;
    }
    auto renderFn = widget.asObject(rt).getProperty(rt, "render");
    if (!renderFn.isObject() ||
        !renderFn.asObject(rt).isFunction(rt)) {
      LOGE("evaluateBundle: __voltraWidgets[%s].render is not a function",
           widgetId.c_str());
      return JNI_FALSE;
    }

    LOGI("evaluateBundle: render() captured for widgetId=%s (%zu chars)",
         widgetId.c_str(), source.size());
    return JNI_TRUE;
  } catch (const jsi::JSError &e) {
    LOGE("evaluateBundle JSError: %s", e.getMessage().c_str());
    return JNI_FALSE;
  } catch (const std::exception &e) {
    LOGE("evaluateBundle threw: %s", e.what());
    return JNI_FALSE;
  } catch (...) {
    LOGE("evaluateBundle threw: unknown");
    return JNI_FALSE;
  }
}

// Invoke the previously-captured `render(propsJSON, envJSON)` for a widget.
// Props/env cross the boundary as JSON strings (the JS entry parses them); the
// entry returns a JSON string (the resolved Voltra node tree), so no JSON
// marshaling is needed here. Returns null on any error.
extern "C" JNIEXPORT jstring JNICALL
Java_voltra_runtime_VoltraJSRenderer_nativeRender(
    JNIEnv *env, jobject /* this */, jstring jWidgetId, jstring jPropsJSON,
    jstring jEnvJSON) {
  std::lock_guard<std::mutex> lock(g_mutex);
  if (!g_runtime) {
    LOGE("render called before evaluateBundle");
    return nullptr;
  }
  try {
    auto &rt = *g_runtime;
    const std::string widgetId = jstringToStd(env, jWidgetId);
    const std::string propsJSON = jstringToStd(env, jPropsJSON);
    const std::string envJSON = jstringToStd(env, jEnvJSON);

    auto registry = rt.global().getProperty(rt, "__voltraWidgets");
    if (!registry.isObject()) {
      LOGE("render: __voltraWidgets missing (bundle not evaluated?)");
      return nullptr;
    }
    auto widget = registry.asObject(rt).getProperty(rt, widgetId.c_str());
    if (!widget.isObject()) {
      LOGE("render: no captured widget for widgetId=%s", widgetId.c_str());
      return nullptr;
    }
    auto renderProp = widget.asObject(rt).getProperty(rt, "render");
    if (!renderProp.isObject() ||
        !renderProp.asObject(rt).isFunction(rt)) {
      LOGE("render: render is not a function for widgetId=%s",
           widgetId.c_str());
      return nullptr;
    }
    auto renderFn = renderProp.asObject(rt).asFunction(rt);

    jsi::Value result = renderFn.call(
        rt, jsi::String::createFromUtf8(rt, propsJSON),
        jsi::String::createFromUtf8(rt, envJSON));

    if (!result.isString()) {
      LOGE("render: did not return a string for widgetId=%s", widgetId.c_str());
      return nullptr;
    }
    std::string resultStr = result.asString(rt).utf8(rt);
    return env->NewStringUTF(resultStr.c_str());
  } catch (const jsi::JSError &e) {
    LOGE("render JSError: %s", e.getMessage().c_str());
    return nullptr;
  } catch (const std::exception &e) {
    LOGE("render threw: %s", e.what());
    return nullptr;
  } catch (...) {
    LOGE("render threw: unknown");
    return nullptr;
  }
}