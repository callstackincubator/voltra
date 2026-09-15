# @use-voltra/android-client

## 2.3.0

### Minor Changes

- a101612: Add `VoltraAndroid.ArcProgressIndicator`, a determinate arc gauge for Android
  widgets: a partial ring that fills clockwise, with configurable stroke width,
  start and sweep angles, rounded or flat ends, an optional sweep gradient, and
  children centered inside the arc. It is the first determinate circular
  indicator Voltra can draw on Android, and it renders on every supported
  Android version.
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

- 6e4dad1: Configure each placed Android Dynamic Widget separately. Every widget on the
  Home Screen has its own `appWidgetId`, so one placement can now show London
  and another New York without the widget code changing — it still reads
  `env.configuration` and gets the values of the placement being drawn. Write
  them with `setWidgetInstanceConfiguration`, one key at a time or several at
  once, read them back with `getWidgetInstanceConfiguration`, and drop them with
  `clearWidgetInstanceConfiguration` so the placement follows the widget-type
  values again. `setWidgetConfiguration` keeps writing the value every
  unconfigured placement renders, and `getWidgetConfiguration` reads that layer
  on its own. Removing a widget from the Home Screen drops its values, so adding
  it again starts fresh. `getActiveWidgets` entries gain `appWidgetId` and
  `widgetType`, which say which is the Android placement and which is the Voltra
  widget; the old `widgetId` and `name` keep their values and are deprecated.
  Existing configuration keeps working with no migration.
- 30bbfb1: Per-instance Dynamic Widget configuration now survives a launcher restore. When
  Android restores the home screen from a backup and assigns new widget ids, each
  placement's values move to its new id, so a widget configured for London still
  shows London afterwards instead of falling back to the widget-type values.
  Server-driven widgets reschedule their per-configuration fetches under the new
  ids at the same time.
- b329013: Android widgets now resolve their kind (payload-driven vs. Dynamic Widget) before acting on a call, instead of a wrong call silently leaving the widget stuck on "Loading…" (issue #222):

  - `updateAndroidWidget` now rejects with `VOLTRA_WIDGET_KIND_MISMATCH` when called on a Dynamic Widget instead of silently leaving it in the loading state. `updateAndroidDynamicWidget` and `setWidgetConfiguration` now reject with `VOLTRA_WIDGET_KIND_MISMATCH` when called on a payload-driven widget, and with `VOLTRA_WIDGET_NOT_FOUND` for an unknown widget id. Callers that previously ignored these promises may now see a rejection.
  - Dynamic Widget placeholders are read only from the bundled initial-states asset and are no longer affected by payload data written by an older app version.
  - Server-driven refresh (the background worker and the widget's refresh button) now skips widgets that are not payload-driven, rather than writing payload data for them.
  - Pin previews (`requestPinGlanceAppWidget`) now compose payload-driven widgets with their registered renderer; Dynamic Widgets rely on the launcher's own provider preview.

- 571c221: Android widget internals are now split into two packages by engine (ADR 0000): payload-driven
  widgets live under `voltra.widget.payload` (`VoltraPayloadWidgetReceiver`, `VoltraGlanceWidget`,
  `VoltraWidgetManager`, and friends), and Dynamic Widgets live under `voltra.dynamicwidget`
  (`VoltraClientWidgetReceiver`, `VoltraClientGlanceWidget`, `VoltraJSRenderer`,
  `VoltraConfigurationStore`, and friends). Generated widget receivers now reference these new base
  classes, so projects must re-run `voltra apply` or `expo prebuild` after upgrading to regenerate
  them.

  The WorkManager worker (`voltra.widget.VoltraWidgetUpdateWorker`) and the Glance refresh action
  (`voltra.widget.VoltraRefreshActionCallback`) keep their existing fully qualified class names, so
  already-installed widgets' background refresh and refresh buttons keep working across the upgrade.

  This is a breaking change for any project that imports the Kotlin widget classes directly (rather
  than through the generated receivers and the public `Voltra`/`VoltraModule` API) — those imports
  must be updated to the new packages.

  The `voltra.runtime` package is removed: `VoltraJSRenderer` and `VoltraConfigurationStore` now
  live under `voltra.dynamicwidget`, and the native renderer's JNI exports were renamed to match.
  Those symbols are private to the bundled `libvoltra_js_renderer.so` and are not part of any
  supported integration, so no supported usage is affected.

  `voltra.glance.RemoteViewsGenerator` moved to `voltra.widget.payload.RemoteViewsGenerator`, since
  it is used only by the payload engine.

  `VoltraWidgetReceiver.widgetKind` and `createGlanceAppWidget()` are now abstract instead of
  defaulting to the payload-driven behavior, so any hand-written receiver extending
  `voltra.widget.VoltraWidgetReceiver` directly must now extend
  `voltra.widget.payload.VoltraPayloadWidgetReceiver` or `voltra.dynamicwidget.VoltraClientWidgetReceiver`
  instead.

  Cross-kind reloads (clear all, reload all, colour-scheme re-render) now classify each installed
  widget through the kind resolver instead of assuming a widget id is Dynamic "by subtraction". A
  widget whose receiver cannot be resolved is logged and skipped rather than treated as Dynamic.
  Reload-all also now classifies cached/server-driven ids through the resolver instead of assuming
  every one of them is payload-driven: an id that still has a stale cached payload but resolves as a
  Dynamic Widget has that stale payload purged and is reloaded through the Dynamic path instead of
  having the stale payload pushed onto it.

- ada18c8: Android widgets can now declare resize bounds: `minResizeWidth`, `minResizeHeight`, `maxResizeWidth`,
  and `maxResizeHeight`, all optional and in dp. The `minResize*` pair sets the smallest size a user can
  resize the widget to and is supported on all Android versions; the `maxResize*` pair sets the largest
  size and is honoured from Android 12 on, and ignored by older versions. Both pairs are
  pass-through — set what you need and Voltra emits exactly that, so existing widgets are unaffected.

  Android silently ignores a resize bound that contradicts the widget's minimum size — for example
  `minResizeWidth` greater than `minWidth`, or `maxResizeWidth` smaller than `minWidth` — and likewise
  for the height pair against `minHeight`. Voltra now warns at build time, naming the attribute, when it
  detects one of these contradictions, rather than failing the build.

- b856fa7: Charts accept a `yScale` prop that pins the y-axis. Pass `{ min, max }` for a fixed window, or a
  single bound such as `{ min: 0 }` to keep the baseline at zero while the other side follows the
  data. Pinned bounds win over the automatic range on both platforms, and values outside them are
  clipped to the plot.
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

- b856fa7: Android charts now frame the values they plot instead of always starting the
  y-axis at zero, and axis labels carry as many decimals as the distance between
  ticks needs. A line or point series of very small values, such as exchange
  rates, fills the plot and reads its own numbers, while bars and areas keep the
  zero baseline their height is measured against.
- 6410bed: Dynamic Widget build environments now report the installed Voltra client package version instead of a stale hardcoded version.
- d40b069: Fixed two more crashes on older Android versions and a broken settings deep
  link, found by turning on Android Lint's `NewApi` check:

  - On Android 7.0–7.1 (API 24–25), registering the internal event receiver
    used the API 26-only `registerReceiver(receiver, filter, flags)` overload,
    crashing the host process with `NoSuchMethodError` the first time a
    listener was added. Registration now goes through
    `ContextCompat.registerReceiver`, which dispatches to the right mechanism
    for the running OS version.
  - On Android 7.0–11 (API 24–30), a grid widget configured with an adaptive
    column size (`columns: "a:<n>"`) crashed on render because
    `GridCells.Adaptive` requires Android 12 (API 31). Those widgets now fall
    back to a 2-column fixed layout below API 31 instead of crashing.
  - Calling the API that opens the promoted-notification settings screen threw
    on Android 7.0–7.1 (API 24–25), where no screen exists for that intent
    action. It now opens the app's details settings screen on those versions
    instead.

- 84f7791: Fixed a crash on Android 7.0-11 (API 24-30) where updating a widget brought
  down the whole host process with `NoSuchMethodError:
RemoteViews(Ljava/util/Map;)V`. Widgets on those versions now resolve a
  single best-fit layout for the current portrait/landscape bounds instead of
  relying on the Android 12+ size-mapping constructor.

  Widgets configured with only `targetCellWidth`/`targetCellHeight` (no
  explicit `minWidth`/`minHeight`) also declare a derived minimum size in their
  provider info, so launchers on API 24-30 - where the target-cell attributes
  are ignored - place them at the intended size instead of an arbitrary one.

- a70b5fd: Fixed widget updates silently doing nothing on apps whose `applicationId`
  differs from their Android `namespace`, as is the case for flavour-based
  build variants and `applicationIdSuffix`. Receiver classes are generated into
  the `namespace` package, but were looked up under the `applicationId`
  returned by `Context.getPackageName()`, so `getActiveWidgets`,
  `updateWidget`, the refresh action, the server-update worker and
  `requestPinWidget` all addressed a class that does not exist. The receiver
  class name is now read from the receivers the app actually declares.
- 7a8601e: Fixed a crash on Android 7.0–8.0 (API 24–25) devices when starting or updating
  an ongoing notification: the module now falls back to the pre-notification-channel
  `Notification.Builder` constructor on those OS versions instead of calling an
  API 26-only constructor. The module's declared minimum SDK version is now
  honestly 24 (matching what it actually supports) instead of a `31` fallback
  that Expo hosts never applied, and apps below that floor now fail the Gradle
  build with a clear error instead of a cryptic manifest-merger failure.
- Updated dependencies [7492c5e]
- Updated dependencies [a101612]
- Updated dependencies [6e4dad1]
- Updated dependencies [b856fa7]
- Updated dependencies [6410bed]
- Updated dependencies [65bf5be]
- Updated dependencies [58235a7]
  - @use-voltra/expo-plugin@2.3.0
  - @use-voltra/android@2.3.0
  - @use-voltra/compiler@2.3.0

## 2.2.0

### Minor Changes

- 42996c5: Add typed, JSON-serializable runtime-props update APIs for entry-based Dynamic Widgets on both platforms:

  - Android adds `updateAndroidDynamicWidget`, persists the latest props per widget ID in private `SharedPreferences`, passes them into the Hermes render path, and refreshes only matching Glance receiver instances.
  - iOS adds `updateDynamicWidget`, persists the latest props per widget ID in App Group `UserDefaults`, passes them into the JavaScriptCore/WidgetKit render path, and reloads only the matching WidgetKit kind.

  Both platforms default to `{}` when no props are stored. On iOS, configure `groupIdentifier` so the app and WidgetKit extension can share runtime props. Rebuild the native Android and iOS apps after upgrading so the new TurboModule methods and native props persistence are included.

### Patch Changes

- 46fdec0: Respect Android ABI selections and avoid bundling duplicate Hermes libraries.
- 6fc0177: Android client native libraries now support 16 KB page sizes required by Android 15 and Google Play.
- 5cc2189: Fix Android builds for React Native 0.81 apps by linking the correct Hermes prefab target.
- Updated dependencies [6ee694b]
  - @use-voltra/android@2.2.0
  - @use-voltra/compiler@2.2.0
  - @use-voltra/expo-plugin@2.2.0

## 2.0.0

### Patch Changes

- Updated dependencies [3833dfe]
- Updated dependencies [948eb15]
- Updated dependencies [1e014f1]
  - @use-voltra/expo-plugin@2.0.0
  - @use-voltra/android@2.0.0

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/android@1.4.1

## 1.4.0

### Minor Changes

- Work on decomposing Voltra into smaller packages continues, and more pieces have moved from the umbrella package into the respective `@use-voltra/*` packages. You should still use the `voltra` umbrella for your app.

### Patch Changes

- Updated dependencies
- Updated dependencies [14d4fa5]
- Updated dependencies
  - @use-voltra/android@1.4.0
