# @use-voltra/android-renderer

Voltra widget payload resolver bundled for execution inside the standalone Hermes runtime on Android. Substitutes `{{ appIntent.X }}` placeholders in a widget payload at render time, mirroring the iOS counterpart (`@use-voltra/ios-renderer`) one-to-one.

This package ships as part of **Track 4 — Hermes-in-Process** (PoC). Track 4 is a proof-of-concept that the JS-resolver pattern from iOS Track 2 generalises to Android via Hermes — same JS bundle, two platforms.

Build the bundle once with `npm run build:bundle`; the output (`bundle/android-renderer.js`) is what the config plugin copies into `android/app/src/main/assets/voltra/` during prebuild.
