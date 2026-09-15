# voltra

## 2.3.0

### Minor Changes

- 571c221: Generated Android widget receivers now extend the new payload/dynamic base classes
  (`voltra.widget.payload.VoltraPayloadWidgetReceiver`, `voltra.widget.payload.VoltraWidgetUpdateScheduler`,
  `voltra.dynamicwidget.VoltraClientWidgetReceiver`) introduced by the Android widget kind separation.
  Re-run `voltra apply` after upgrading so your generated receivers pick up the new imports and superclasses.
- 4a29455: Android widgets configured with only `targetCellWidth`/`targetCellHeight` now get a correct
  default size on Android 11 and older. Those attributes are an Android 12+ concept; older devices
  ignore them and place widgets by `minWidth`/`minHeight` in dp instead, and Voltra previously only
  emitted those when they were set explicitly. Such a widget had no declared size before Android 12,
  so launchers placed it at the smallest size that would fit rather than the size it asked for.

  `minWidth`/`minHeight` are now always emitted. When not set explicitly they are derived from the
  widget's cell size, using the deprecated `minCellWidth`/`minCellHeight` if present and
  `targetCellWidth`/`targetCellHeight` otherwise. The cell-to-dp conversion also moves from the
  legacy `cells * 70 - 30` to the figures Google currently publishes, which place widgets correctly
  on more devices — the previous 2-cell width of 110dp fit inside a single cell on tablets, where a
  cell can measure 111dp. Cell size still varies by device, launcher and orientation, so the
  conversion remains an approximation; set `minWidth`/`minHeight` explicitly if you need precise
  placement on Android 11 and older. `minCellWidth` and `minCellHeight` still work but are
  deprecated in favor of `minWidth`/`minHeight`.

  Re-running the plugin or the `voltra` CLI regenerates each widget's `appwidget-provider` XML with
  the new `minWidth`/`minHeight` values, so those generated files will show as changed.

- ada18c8: Android widgets can now declare resize bounds: `minResizeWidth`, `minResizeHeight`, `maxResizeWidth`,
  and `maxResizeHeight`, all optional and in dp. The `minResize*` pair sets the smallest size a user can
  resize the widget to and is supported on all Android versions; the `maxResize*` pair sets the largest
  size and is honoured from Android 12 on, and ignored by older versions. Both pairs are
  pass-through — set what you need and Voltra emits exactly that, so existing widgets are unaffected.

  Android silently ignores a resize bound that contradicts the widget's minimum size — for example
  `minResizeWidth` greater than `minWidth`, or `maxResizeWidth` smaller than `minWidth` — and likewise
  for the height pair against `minHeight`. Voltra now warns at build time, naming the attribute, when it
  detects one of these contradictions, rather than failing the build.

- c991b65: Add an optional `kind` to iOS widget configs. It overrides the WidgetKit kind (default
  `Voltra_Widget_<id>`), so a widget migrated from a hand-written WidgetKit extension keeps
  its identity and stays on users' Home Screens instead of turning into a placeholder. The
  override is written to both Info.plists as `Voltra_WidgetKinds` and used for timeline
  reloads, `getActiveWidgets`, and orphaned-data cleanup. Supported by both the Expo config
  plugin and `voltra apply`.
- 3f827d9: `voltra apply` now handles apps whose Xcode project has more than one build
  configuration. Projects that give each configuration its own entitlements file
  or `Info.plist` are applied instead of rejected, each file keeps its own
  configuration, and the generated widget extension takes its bundle identifier
  and signing settings from the matching configuration of the app rather than
  from the default one. A build configuration added to the app after the widget
  exists is mirrored onto the widget, and signing settings the app no longer sets
  are dropped from it.

  Build configurations that disagree on the app version are now reported as a
  warning, since the widget extension is generated with the version of the
  default build configuration.

  The `ensureEntitlements` and `ensureInfoPlist` exports now return
  `{ changes: ReportedChange[] }` instead of `{ change?: ReportedChange }`, as
  both can now write more than one file.

- d7c0b8a: `ios.groupIdentifier`, `ios.keychainGroup` and `ios.project.entitlementsPath`
  now accept one value per Xcode build configuration, for apps that ship several
  environments from the same project:

  ```ts
  ios: {
    groupIdentifier: {
      Debug: 'group.com.example.app.dev',
      Release: 'group.com.example.app',
    },
  }
  ```

  `voltra apply` writes those values into the Xcode project as build settings on
  the app and widget targets, so each build picks up the value for the
  configuration it is built with. A single string keeps behaving exactly as
  before.

  The `ios` parameter of the exported iOS platform helpers is now
  `ResolvedVoltraIOSConfig`, the shape those helpers already required: per-build
  configuration values are resolved against the Xcode project before they reach
  it.

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
- 9ea2428: Fixed widget extension builds failing on Xcode 27 with `Unable to resolve module dependency:
'VoltraWidget'`. The CLI's generated `VoltraWidgetBundle.swift` imported `VoltraWidget`, but both
  CocoaPods podspecs compile that code under the module name `VoltraRuntime` (required so
  `ActivityAttributes` types match across the app and widget extension process boundary). Earlier
  Xcode versions tolerated the mismatched import; Xcode 27's stricter explicit-module-build
  dependency resolution rejects it. The generated import now matches the actual module name.

  Re-running the `voltra` CLI regenerates `VoltraWidgetBundle.swift` with the corrected import.

- Updated dependencies [58235a7]
  - @use-voltra/compiler@2.3.0

## 2.2.0

## 2.0.0

### Minor Changes

- 948eb15: Add SVG support to image preloading on iOS and Android.

### Patch Changes

- Updated dependencies [9a0857d]
- Updated dependencies [948eb15]
- Updated dependencies [1e014f1]
  - @use-voltra/ios@2.0.0
  - @use-voltra/android@2.0.0
