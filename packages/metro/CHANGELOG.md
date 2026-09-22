# @use-voltra/metro

## 2.3.2

### Patch Changes

- db3cfb8: Release builds of React Native CLI projects no longer hang forever at
  `createBundleReleaseJsAndAssets` (or the Xcode bundling phase) once a Dynamic
  Widget or Dynamic Live Activity is configured. The widget bundler now starts
  with the Metro dev server instead of whenever the Metro config is loaded.
  - @use-voltra/compiler@2.3.2
  - @use-voltra/expo-plugin@2.3.2

## 2.3.1

### Patch Changes

- @use-voltra/compiler@2.3.1
- @use-voltra/expo-plugin@2.3.1

## 2.3.0

### Minor Changes

- 7492c5e: Add Dynamic Live Activities (experimental): bundle a Live Activity's rendering
  definition in the app and drive it with a small JSON props record instead of a
  fully rendered payload on every update. Configure definitions via the iOS
  plugin's `liveActivities` option, start and update them with the new
  `getDynamicLiveActivityDefinitionIds`, `startDynamicLiveActivity`, and
  `updateDynamicLiveActivity` APIs, and iterate with hot reload and push
  updates through Metro's dedicated Dynamic Live Activity pipeline.
- 58235a7: Widget files can now import `StyleSheet` and `Platform` from `react-native`, so widget styles
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

### Patch Changes

- Updated dependencies [7492c5e]
- Updated dependencies [6410bed]
- Updated dependencies [65bf5be]
- Updated dependencies [58235a7]
  - @use-voltra/expo-plugin@2.3.0
  - @use-voltra/compiler@2.3.0

## 2.2.0

### Patch Changes

- d18c588: Ensure the private Metro instance watches the project root so Dynamic Widget source files can be resolved.
  - @use-voltra/compiler@2.2.0
  - @use-voltra/expo-plugin@2.2.0
