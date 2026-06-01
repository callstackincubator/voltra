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
# Phase 0 — smoke test
# ---------------------------------------------------------------------------
# Throwaway target that creates a standalone Hermes runtime, evaluates `1+1`,
# and returns the result to Kotlin via JNI. Validates that:
#   1. Voltra's android-client AAR can carry native code
#   2. Hermes headers + libhermes.so are linkable from a Voltra-owned target
#   3. `hermes::makeHermesRuntime()` works outside the React Native bridge
# Delete this target and its sources before merging if the broader PoC fails.
add_library(voltra_smoke SHARED
  src/main/cpp/voltra_smoke.cpp
)

target_link_libraries(voltra_smoke
  android
  log
  ReactAndroid::jsi
  hermes-engine::hermesvm
  fbjni::fbjni
)