cmake_minimum_required(VERSION 3.13)
project(voltra)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# React Native publishes JSI + Hermes via Prefab modules in their AARs.
# We consume them through find_package below.
#
# NOTE: find_package does NOT error on a wrong target *name* — the failure only
# surfaces at target_link_libraries. The correct Hermes prefab target on Android
# (RN 0.83, com.facebook.react:hermes-android) is `hermes-engine::hermesvm`.
find_package(ReactAndroid REQUIRED CONFIG)
find_package(hermes-engine REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)

# ---------------------------------------------------------------------------
# Voltra JS Renderer (client-rendered widgets on Android)
# ---------------------------------------------------------------------------
# Standalone Hermes runtime owned by Voltra, independent of the React Native
# bridge. Evaluates a per-widget Metro bundle that exposes `render(props, env)`
# and invokes it on every Glance render. JNI surface in voltra_js_renderer.cpp.
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