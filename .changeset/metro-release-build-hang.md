---
'@use-voltra/metro': patch
---

Release builds of React Native CLI projects no longer hang forever at
`createBundleReleaseJsAndAssets` (or the Xcode bundling phase) once a Dynamic
Widget or Dynamic Live Activity is configured. The widget bundler now starts
with the Metro dev server instead of whenever the Metro config is loaded.
