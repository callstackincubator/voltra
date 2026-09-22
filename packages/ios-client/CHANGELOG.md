# @use-voltra/ios-client

## 2.3.2

### Patch Changes

- 3ba1b1b: The hot-reload hook used by both platforms is now a single shared implementation in
  @use-voltra/core, re-exported by the iOS and Android packages instead of being duplicated in
  each client. No API changes for apps.
- Updated dependencies [910e7fe]
- Updated dependencies [3ba1b1b]
  - @use-voltra/ios@2.3.2
  - @use-voltra/compiler@2.3.2
  - @use-voltra/expo-plugin@2.3.2

## 2.3.1

### Patch Changes

- @use-voltra/compiler@2.3.1
- @use-voltra/expo-plugin@2.3.1
- @use-voltra/ios@2.3.1

## 2.3.0

### Minor Changes

- 7492c5e: Add Dynamic Live Activities (experimental): bundle a Live Activity's rendering
  definition in the app and drive it with a small JSON props record instead of a
  fully rendered payload on every update. Configure definitions via the iOS
  plugin's `liveActivities` option, start and update them with the new
  `getDynamicLiveActivityDefinitionIds`, `startDynamicLiveActivity`, and
  `updateDynamicLiveActivity` APIs, and iterate with hot reload and push
  updates through Metro's dedicated Dynamic Live Activity pipeline.
- b856fa7: Charts accept a `yScale` prop that pins the y-axis. Pass `{ min, max }` for a fixed window, or a
  single bound such as `{ min: 0 }` to keep the baseline at zero while the other side follows the
  data. Pinned bounds win over the automatic range on both platforms, and values outside them are
  clipped to the plot.
- c991b65: Add an optional `kind` to iOS widget configs. It overrides the WidgetKit kind (default
  `Voltra_Widget_<id>`), so a widget migrated from a hand-written WidgetKit extension keeps
  its identity and stays on users' Home Screens instead of turning into a placeholder. The
  override is written to both Info.plists as `Voltra_WidgetKinds` and used for timeline
  reloads, `getActiveWidgets`, and orphaned-data cleanup. Supported by both the Expo config
  plugin and `voltra apply`.
- 413d6b4: Server-driven Dynamic Widgets now fetch, cache, and store props per placement
  instead of per widget. When a widget has configuration parameters (Android
  instance configuration, or the iOS Edit Widget sheet), every request now
  carries the placement's merged configuration as `instance` (a stable hash) and
  `configuration` (canonical JSON) query parameters, so a backend can answer a
  London placement and a New York placement of the same widget differently from
  one endpoint. Two placements with identical configuration share one fetch, one
  cached response, and one props slot, so fetch count scales with the number of
  distinct configurations, not the number of placements. `env.instance` carries
  the same hash to the widget, and is `undefined` for a widget with no
  configuration parameters — which keeps sending the same request and sharing
  the same props slot exactly as it did before. `instance` and `configuration`
  join the reserved query keys `setWidgetServerUpdate` rejects.
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

- 7f84f4d: Dynamic Live Activities now apply `activityBackgroundTint` in the small
  activity family (Apple Watch Smart Stack and CarPlay), matching legacy Live
  Activities. Previously the tint was only applied to the Lock Screen
  presentation.
- 6410bed: Dynamic Widget build environments now report the installed Voltra client package version instead of a stale hardcoded version.
- a06a26f: Fix the iOS config plugin dropping the app's URL schemes from `Info.plist`. `ensureURLScheme`
  wrote `ios.infoPlist.CFBundleURLTypes`, which trips the property guard around Expo's own
  `withScheme` mod: once that key is set, Expo stops writing `CFBundleURLTypes` altogether, so
  `expo.scheme` never reached the built app and deep links into it failed. The plugin now only
  tops up a `CFBundleURLTypes` list the app already owns, and reads array `scheme` / `ios.scheme`
  values instead of falling back to the bundle identifier whenever `scheme` is not a string. The
  widget extension's `Info.plist` gets the same scheme list, so relative Live Activity links resolve
  to the app's own scheme when `scheme` is an array.
- 98be256: Widgets and Live Activities on iOS now pick up a style change even when the payload
  reuses the same deduplicated style slot, so a timeline entry that only recolors an
  otherwise unchanged label no longer keeps the previous colour on screen. The same
  applies to labels, gauge and progress captions, mask elements and image fallbacks
  whose content is shared between elements.
- 24accaf: Server-driven iOS widgets now keep showing the latest server content when the native refresh button is tapped, when several widget instances reload at once, or when a fetch fails. Previously such reloads could reset the widget to its initial state when no App Group was configured or when locally pushed timeline data existed.
- Updated dependencies [7492c5e]
- Updated dependencies [b856fa7]
- Updated dependencies [6410bed]
- Updated dependencies [65bf5be]
- Updated dependencies [58235a7]
  - @use-voltra/expo-plugin@2.3.0
  - @use-voltra/ios@2.3.0
  - @use-voltra/compiler@2.3.0

## 2.2.0

### Minor Changes

- 42996c5: Add typed, JSON-serializable runtime-props update APIs for entry-based Dynamic Widgets on both platforms:

  - Android adds `updateAndroidDynamicWidget`, persists the latest props per widget ID in private `SharedPreferences`, passes them into the Hermes render path, and refreshes only matching Glance receiver instances.
  - iOS adds `updateDynamicWidget`, persists the latest props per widget ID in App Group `UserDefaults`, passes them into the JavaScriptCore/WidgetKit render path, and reloads only the matching WidgetKit kind.

  Both platforms default to `{}` when no props are stored. On iOS, configure `groupIdentifier` so the app and WidgetKit extension can share runtime props. Rebuild the native Android and iOS apps after upgrading so the new TurboModule methods and native props persistence are included.

- 691b43f: Restructure the widget Xcode integration and fix signing, versioning, and misconfiguration behavior.

  - Widget code signing now mirrors the main app per build configuration (Debug→Debug,
    Release→Release) instead of copying the first configuration's settings into both, so
    manual-signing release builds get the correct provisioning profile.
  - The widget's `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` now follow `expo.version`
    and `expo.ios.buildNumber` (falling back to the previous `1.0`/`1` when unset), matching
    App Store Connect's requirement that an appex version match its host app.
  - The plugin now throws an actionable error when `expo.ios.bundleIdentifier` is missing
    instead of silently skipping widget setup.
  - Internally, target setup is collapsed into a single idempotent ensure pipeline and build
    phases are matched semantically rather than by comment strings.

### Patch Changes

- 97aefe4: Harden the generated Podfile widget-target block.

  The block is now delimited by `# @voltra-widget-target BEGIN/END` markers and upserted
  idempotently (legacy unmarked blocks are migrated, renamed targets update in place). The
  embedded Ruby raises an actionable error when `@use-voltra/ios-client` cannot be resolved
  instead of generating a broken target, and the podspec path is canonicalized with
  `File.realpath` so pnpm and bun symlinked installs resolve correctly.

- 121fa8d: Fix Xcode project corruption when the app already contains another app extension.

  The config plugin now scopes all pbxproj mutations to the widget's own objects: file
  references resolve through the widget's PBXGroup instead of by bare path, build phases are
  created empty and populated without adopting other targets' PBXBuildFiles, and an existing
  "Embed App Extensions" phase is reused (detected via `dstSubfolderSpec == 13`) instead of
  duplicated. Resolves the `[Xcodeproj] Consistency issue: no parent for object` and
  `Cycle inside <target>` failures during `pod install`, and makes repeated `expo prebuild`
  runs idempotent.

  - @use-voltra/compiler@2.2.0
  - @use-voltra/expo-plugin@2.2.0
  - @use-voltra/ios@2.2.0

## 2.0.0

### Major Changes

- 3833dfe: **Breaking change.** Voltra’s iOS native code now requires a **minimum deployment target of iOS 16.4** (bumped from the previous minimum). Raise it everywhere it matters (Xcode targets, `expo-build-properties`, CocoaPods, and CI), so you are not still building for 16.3 or lower.

  This release also brings **Expo SDK 56** compatibility; you can upgrade Expo on your own timeline and you **do not** need to be on SDK 56 before adopting this Voltra version.

### Minor Changes

- 9a0857d: Add an `accentedRenderingMode` prop to the iOS `Image` component for iOS 18+ Home Screen widgets. When the widget renders in `accented` or `vibrant` mode, the prop maps to SwiftUI's `widgetAccentedRenderingMode(_:)` so consumers can opt individual images out of the system's default desaturation (e.g. pass `"fullColor"` to keep an image's original colors over the tinted backdrop). It is a no-op on iOS &lt; 18, in Live Activities, and in `fullColor` widget mode.

### Patch Changes

- ef9f1da: Add a reactive `useIsHeadless()` helper for iOS headless launches and update iOS headless launch handling so apps can render again when users open them from a background launch.
- Updated dependencies [3833dfe]
- Updated dependencies [9a0857d]
- Updated dependencies [948eb15]
  - @use-voltra/expo-plugin@2.0.0
  - @use-voltra/ios@2.0.0

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/ios@1.4.1

## 1.4.0

### Minor Changes

- Work on decomposing Voltra into smaller packages continues, and more pieces have moved from the umbrella package into the respective `@use-voltra/*` packages. You should still use the `voltra` umbrella for your app.

### Patch Changes

- Updated dependencies
  - @use-voltra/ios@1.4.0
