// Voltra JS Renderer — Hermes-on-Android JNI wrapper for Dynamic Widgets.
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

#include <chrono>
#include <memory>
#include <mutex>
#include <string>

#define LOG_TAG "VoltraJSRenderer"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Perf timing logs — debug builds only (release CMake defines NDEBUG).
#ifndef NDEBUG
#define LOGPERF(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#else
#define LOGPERF(...) ((void)0)
#endif

namespace jsi = facebook::jsi;

namespace {

using Clock = std::chrono::steady_clock;

double millisSince(Clock::time_point start) {
  return std::chrono::duration<double, std::milli>(Clock::now() - start).count();
}

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

// Throws voltra.dynamicwidget.VoltraJSException(message, stack) so Kotlin gets the reason a
// widget failed (ADR 0013). The class name and constructor are part of this file's JNI contract;
// consumer-rules.pro keeps them from being renamed or removed by R8.
void throwJsFailure(JNIEnv *env, const std::string &message,
                    const std::string *stack) {
  jclass cls = env->FindClass("voltra/dynamicwidget/VoltraJSException");
  if (cls == nullptr) {
    // FindClass left a NoClassDefFoundError pending, which is the best we can report.
    return;
  }
  jmethodID ctor = env->GetMethodID(cls, "<init>",
                                    "(Ljava/lang/String;Ljava/lang/String;)V");
  if (ctor == nullptr) {
    return;
  }
  jstring jMessage = env->NewStringUTF(message.c_str());
  jstring jStack =
      (stack != nullptr && !stack->empty()) ? env->NewStringUTF(stack->c_str()) : nullptr;
  jobject exception = env->NewObject(cls, ctor, jMessage, jStack);
  if (exception != nullptr) {
    env->Throw(static_cast<jthrowable>(exception));
  }
}

const char *jsTypeName(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isUndefined()) return "undefined";
  if (value.isNull()) return "null";
  if (value.isBool()) return "boolean";
  if (value.isNumber()) return "number";
  if (value.isString()) return "string";
  if (value.isSymbol()) return "symbol";
  if (value.isObject()) {
    return value.asObject(rt).isFunction(rt) ? "function" : "object";
  }
  return "unknown";
}

} // namespace

// Evaluate a (Kotlin-wrapped) widget bundle and verify the capture bootstrap
// registered `globalThis.__voltraWidgets[<widgetId>].render`. On any JS error or
// if the render function was not captured it throws VoltraJSException.
extern "C" JNIEXPORT jboolean JNICALL
Java_voltra_dynamicwidget_VoltraJSRenderer_nativeEvaluateBundle(
    JNIEnv *env, jobject /* this */, jstring jWrappedSource, jstring jSourceURL,
    jstring jWidgetId) {
  std::lock_guard<std::mutex> lock(g_mutex);
  try {
    const std::string source = jstringToStd(env, jWrappedSource);
    const std::string sourceURL = jstringToStd(env, jSourceURL);
    const std::string widgetId = jstringToStd(env, jWidgetId);

    const bool firstRuntime = (g_runtime == nullptr);
    auto tRuntime = Clock::now();
    auto &rt = runtime();
    if (firstRuntime) {
      LOGPERF("[perf] runtime init: %.2f ms", millisSince(tRuntime));
    }

    auto tEval = Clock::now();
    rt.evaluateJavaScript(
        std::make_unique<jsi::StringBuffer>(source), sourceURL);
    LOGPERF("[perf] bundle eval: %.2f ms (%zu chars)", millisSince(tEval), source.size());

    auto registry = rt.global().getProperty(rt, "__voltraWidgets");
    if (!registry.isObject()) {
      LOGE("evaluateBundle: globalThis.__voltraWidgets missing after eval");
      throwJsFailure(env, "The bundle did not register any Voltra widget (globalThis.__voltraWidgets is missing after evaluation)", nullptr);
      return JNI_FALSE;
    }
    auto widget = registry.asObject(rt).getProperty(rt, widgetId.c_str());
    if (!widget.isObject()) {
      LOGE("evaluateBundle: no entry for widgetId=%s", widgetId.c_str());
      throwJsFailure(env, "The bundle did not export a widget entry for widgetId=" + widgetId, nullptr);
      return JNI_FALSE;
    }
    auto renderFn = widget.asObject(rt).getProperty(rt, "render");
    if (!renderFn.isObject() ||
        !renderFn.asObject(rt).isFunction(rt)) {
      LOGE("evaluateBundle: __voltraWidgets[%s].render is not a function",
           widgetId.c_str());
      throwJsFailure(env, "The widget entry for widgetId=" + widgetId + " does not export a render function", nullptr);
      return JNI_FALSE;
    }

    LOGI("evaluateBundle: render() captured for widgetId=%s (%zu chars)",
         widgetId.c_str(), source.size());
    return JNI_TRUE;
  } catch (const jsi::JSError &e) {
    LOGE("evaluateBundle JSError: %s", e.getMessage().c_str());
    const std::string stack = e.getStack();
    throwJsFailure(env, e.getMessage(), &stack);
    return JNI_FALSE;
  } catch (const std::exception &e) {
    LOGE("evaluateBundle threw: %s", e.what());
    throwJsFailure(env, e.what(), nullptr);
    return JNI_FALSE;
  } catch (...) {
    LOGE("evaluateBundle threw: unknown");
    throwJsFailure(env, "Unknown native exception while evaluating the bundle", nullptr);
    return JNI_FALSE;
  }
}

// Invoke the previously-captured `render(propsJSON, envJSON)` for a widget.
// Props/env cross the boundary as JSON strings (the JS entry parses them); the
// entry returns a JSON string (the resolved Voltra node tree), so no JSON
// marshaling is needed here. Any failure throws VoltraJSException (message + JS stack).
extern "C" JNIEXPORT jstring JNICALL
Java_voltra_dynamicwidget_VoltraJSRenderer_nativeRender(
    JNIEnv *env, jobject /* this */, jstring jWidgetId, jstring jPropsJSON,
    jstring jEnvJSON) {
  std::lock_guard<std::mutex> lock(g_mutex);
  if (!g_runtime) {
    LOGE("render called before evaluateBundle");
    throwJsFailure(env, "render() was called before any bundle was evaluated", nullptr);
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
      throwJsFailure(env, "render() was called before the bundle was evaluated (globalThis.__voltraWidgets is missing)", nullptr);
      return nullptr;
    }
    auto widget = registry.asObject(rt).getProperty(rt, widgetId.c_str());
    if (!widget.isObject()) {
      LOGE("render: no captured widget for widgetId=%s", widgetId.c_str());
      throwJsFailure(env, "No evaluated widget entry for widgetId=" + widgetId, nullptr);
      return nullptr;
    }
    auto renderProp = widget.asObject(rt).getProperty(rt, "render");
    if (!renderProp.isObject() ||
        !renderProp.asObject(rt).isFunction(rt)) {
      LOGE("render: render is not a function for widgetId=%s",
           widgetId.c_str());
      throwJsFailure(env, "The widget entry for widgetId=" + widgetId + " does not export a render function", nullptr);
      return nullptr;
    }
    auto renderFn = renderProp.asObject(rt).asFunction(rt);

    auto tRender = Clock::now();
    jsi::Value result = renderFn.call(
        rt, jsi::String::createFromUtf8(rt, propsJSON),
        jsi::String::createFromUtf8(rt, envJSON));
    LOGPERF("[perf] render: %.2f ms (widgetId=%s)", millisSince(tRender), widgetId.c_str());

    if (!result.isString()) {
      LOGE("render: did not return a string for widgetId=%s", widgetId.c_str());
      throwJsFailure(env, std::string("render() returned ") + jsTypeName(rt, result) +
                              ", expected a JSON string",
                     nullptr);
      return nullptr;
    }
    std::string resultStr = result.asString(rt).utf8(rt);
    return env->NewStringUTF(resultStr.c_str());
  } catch (const jsi::JSError &e) {
    LOGE("render JSError: %s", e.getMessage().c_str());
    const std::string stack = e.getStack();
    throwJsFailure(env, e.getMessage(), &stack);
    return nullptr;
  } catch (const std::exception &e) {
    LOGE("render threw: %s", e.what());
    throwJsFailure(env, e.what(), nullptr);
    return nullptr;
  } catch (...) {
    LOGE("render threw: unknown");
    throwJsFailure(env, "Unknown native exception while rendering", nullptr);
    return nullptr;
  }
}
