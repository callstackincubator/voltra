# @use-voltra/expo-plugin

## 2.3.2

### Patch Changes

- Updated dependencies [910e7fe]
- Updated dependencies [3ba1b1b]
  - @use-voltra/core@2.3.2
  - @use-voltra/compiler@2.3.2

## 2.3.1

### Patch Changes

- @use-voltra/compiler@2.3.1
- @use-voltra/core@2.3.1

## 2.3.0

### Minor Changes

- 7492c5e: Add Dynamic Live Activities (experimental): bundle a Live Activity's rendering
  definition in the app and drive it with a small JSON props record instead of a
  fully rendered payload on every update. Configure definitions via the iOS
  plugin's `liveActivities` option, start and update them with the new
  `getDynamicLiveActivityDefinitionIds`, `startDynamicLiveActivity`, and
  `updateDynamicLiveActivity` APIs, and iterate with hot reload and push
  updates through Metro's dedicated Dynamic Live Activity pipeline.
- 65bf5be: Dynamic Widgets can now be server-driven: give a widget both `entry` and `serverUpdate` and the device fetches a plain JSON object from your endpoint and hands it to the bundled JS as props, instead of your server having to run Voltra's renderer and return UI (issue #176). The backend can be written in any language.

  - `serverUpdate.url` is now optional. `"serverUpdate": {}` marks a widget server-driven with the URL supplied at runtime, which covers per-tenant backends whose URL is only known after login.
  - New `setWidgetServerUpdate(settings, { widgetId })` and `clearWidgetServerUpdate({ widgetId })` on both platforms let an app change a server-driven widget's `url`, `intervalMinutes`, `method`, `query`, `headers` and `body` at runtime, or set `enabled: false` to stop fetching and drive the widget itself. Settings apply to both render engines, so payload widgets gain runtime URLs and non-GET requests too.
  - `setWidgetServerCredentials` and `clearWidgetServerCredentials` are deprecated in favour of `setWidgetServerUpdate` with an `Authorization` header. They keep their signatures and read and write the same stored records, so nothing migrates on device; they will be removed in a later major.
  - Widgets rendered from fetched props get `env.serverUpdate` with `status`, `fetchedAt`, `error` and `httpStatus`, so a widget can show "updated 3 min ago" or dim itself when the data is stale. It is `undefined` on widgets without a `serverUpdate`.
  - Every server request now also carries a `locale` query parameter, and redirects are followed only within the host the app configured. A widget with an `entry` also sends `If-None-Match` when the previous response had an `ETag`, and honours `Cache-Control: max-age` and `Retry-After` when scheduling its next fetch; a payload widget's request stays unconditional. Dynamic Widgets do not send `family`: one fetch serves every size, so props must be size-agnostic and the entry picks its layout from `env.widgetFamily`.
  - A widget with `entry` and `serverUpdate` defaults to a 15 minute interval on both platforms, and a shorter one is raised to 15 with a warning rather than failing the build. On iOS such a widget requires `ios.groupIdentifier`, because the fetched props are shared with the widget extension through the App Group.
  - `serverUpdate.url` values that are not absolute `http(s)` URLs are now rejected when the native project is generated; plain `http` to a non-local host is reported as a warning, because release builds block cleartext traffic.
  - `clearWidgetServerUpdate()` with no `widgetId` is the logout gesture: it drops the runtime settings and everything the server last sent, so a Dynamic Widget goes back to `{}` with `env.serverUpdate.status` of `never` rather than showing the previous account's data.

  The one behaviour change: `entry` plus `serverUpdate` used to be accepted and ignore the URL. Apps with that config now fetch. Until the endpoint returns props the widget shows its initial state as before, and a payload-shaped response is rejected with a log line naming the mismatch.

  Android widget receivers no longer inline the server URL and interval; they come from a generated `assets/voltra/widget_server_defaults.json`. Run `expo prebuild` or `voltra apply` to regenerate them, as with any generator change.

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

- 6410bed: Dynamic Widget build environments now report the installed Voltra client package version instead of a stale hardcoded version.
- Updated dependencies [b856fa7]
- Updated dependencies [413d6b4]
- Updated dependencies [65bf5be]
- Updated dependencies [58235a7]
  - @use-voltra/core@2.3.0
  - @use-voltra/compiler@2.3.0

## 2.2.0

## 2.0.0

### Major Changes

- 3833dfe: **Breaking change.** Voltra’s iOS native code now requires a **minimum deployment target of iOS 16.4** (bumped from the previous minimum). Raise it everywhere it matters (Xcode targets, `expo-build-properties`, CocoaPods, and CI), so you are not still building for 16.3 or lower.

  This release also brings **Expo SDK 56** compatibility; you can upgrade Expo on your own timeline and you **do not** need to be on SDK 56 before adopting this Voltra version.

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.

## 1.4.0

### Minor Changes

- 14d4fa5: Add Android ongoing notification support, including richer notification content, remote update flows, and server-side payload rendering APIs. This release also expands the Expo integration and documentation so apps can configure, send, and manage Android ongoing notifications more easily.

## 1.3.0

### Patch Changes

- 68271bb: Fix `pod install` failing with "multiple dependencies with different sources for VoltraWidget" when using pnpm or bun (symlinked node_modules). The plugin now resolves the VoltraWidget path to its real path so CocoaPods sees a single source.
