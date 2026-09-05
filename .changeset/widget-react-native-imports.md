---
'@use-voltra/android-client': minor
'@use-voltra/ios-client': minor
'@use-voltra/expo-plugin': minor
'@use-voltra/compiler': minor
'@use-voltra/metro': minor
'voltra': minor
---

Widget files can now import `StyleSheet` and `Platform` from `react-native`, so widget styles
can live outside the element tree the same way they do elsewhere in an app. Previously any
import from `react-native` in a widget file failed `voltra apply` and `expo prebuild` with
`Unexpected token 'typeof'`, and Dynamic Widgets rejected the import at bundle time.

Inside a widget, `Platform.OS` is the platform being built for, and `StyleSheet.create` returns
the styles unchanged. Other `react-native` APIs — components, `Dimensions`, `Animated`,
`PixelRatio`, deep `react-native/...` paths — are rejected with a message naming the symbol
instead of misbehaving at render time.

Importing `@use-voltra/ios-client` or `@use-voltra/android-client` from a widget file now
resolves to the matching rendering package in `voltra apply` and in Dynamic Widget bundles too,
matching what prebuild already did.

Projects that keep their Babel setup in `babel.config.json`, `babel.config.ts`, or any other
filename Babel discovers on its own now have it applied to widget code by `voltra apply`, which
previously looked only for `babel.config.js`, `.cjs`, and `.mjs`.

`@use-voltra/expo-plugin`'s widget evaluation helpers changed shape for the config plugins that
consume them: `evaluateWidgetModuleExports` and `evaluateWidgetModule` now take
`(filePath, { projectRoot, platform })` instead of `(projectRoot, filePath, warnedRedirects)`,
`prerenderWidgetState` takes the target platform as a fourth argument, and `MODULE_EXTENSIONS`
is no longer exported — module resolution now lives in `@use-voltra/compiler`. Projects using
the published Expo plugins are unaffected; only direct callers of these helpers need updating.
