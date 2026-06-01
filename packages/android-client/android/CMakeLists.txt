cmake_minimum_required(VERSION 3.13)
project(voltra)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# React Native publishes JSI + Hermes via Prefab modules in their AARs.
# We consume them through find_package below.
find_package(ReactAndroid REQUIRED CONFIG)
find_package(hermes-engine REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)

# ---------------------------------------------------------------------------
# Voltra JS Renderer (Track 4 — Hermes-on-Android)
# ---------------------------------------------------------------------------
# Standalone Hermes runtime owned by Voltra (independent of the React Native
# bridge). Evaluates the @use-voltra/android-renderer bundle once per process,
# then resolves `{{ appIntent.X }}` placeholders in widget payloads at render
# time. JNI surface defined in voltra_js_renderer.cpp.
add_library(voltra_js_renderer SHARED
  src/main/cpp/voltra_js_renderer.cpp
)

target_link_libraries(voltra_js_renderer
  android
  log
  ReactAndroid::jsi
  hermes-engine::hermesvm
  fbjni::fbjni
)