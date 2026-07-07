cmake_minimum_required(VERSION 3.13)
project(voltra)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# React Native publishes JSI + Hermes via Prefab modules in their AARs.
# We consume them through find_package below.
#
# NOTE: find_package does NOT error on a wrong target *name* — the failure only
# surfaces at target_link_libraries. The Hermes prefab target on Android has
# been renamed across RN versions (com.facebook.react:hermes-android):
#   - RN <= 0.81: prefab module `libhermes` -> CMake target hermes-engine::libhermes
#   - RN >= 0.82: prefab module `hermesvm`  -> CMake target hermes-engine::hermesvm
# We branch on which target find_package actually resolved so Voltra builds
# against both RN generations, and fail fast at configure time if neither
# exists (e.g. a future prefab rename) instead of erroring later at link time.
find_package(ReactAndroid REQUIRED CONFIG)
find_package(hermes-engine REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)

if(TARGET hermes-engine::hermesvm)
  set(VOLTRA_HERMES_TARGET hermes-engine::hermesvm)  # RN >= 0.82
elseif(TARGET hermes-engine::libhermes)
  set(VOLTRA_HERMES_TARGET hermes-engine::libhermes) # RN <= 0.81
else()
  message(FATAL_ERROR "Voltra: hermes-engine prefab found but neither target hermes-engine::hermesvm (RN >= 0.82) nor hermes-engine::libhermes (RN <= 0.81) exists. Unsupported React Native version?")
endif()

# ---------------------------------------------------------------------------
# Voltra JS Renderer (Dynamic Widgets on Android)
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
  ${VOLTRA_HERMES_TARGET}
  fbjni::fbjni
)

# 16KB page size support: explicitly align libvoltra_js_renderer.so to 16KB
# pages regardless of host NDK version. NDK r28+ defaults to this, but we
# pin it explicitly so older NDKs also produce 16KB-compatible output. We
# only support 16KB alignment (no 4KB-only build) — 16KB-aligned libs run
# fine on 4KB-page devices too.
target_link_options(voltra_js_renderer PRIVATE "-Wl,-z,max-page-size=16384")
