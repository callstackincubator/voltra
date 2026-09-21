# @use-voltra/ios

## 2.3.1

### Patch Changes

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
- b856fa7: Charts accept a `yScale` prop that pins the y-axis. Pass `{ min, max }` for a fixed window, or a
  single bound such as `{ min: 0 }` to keep the baseline at zero while the other side follows the
  data. Pinned bounds win over the automatic range on both platforms, and values outside them are
  clipped to the plot.
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

### Patch Changes

- Updated dependencies [b856fa7]
- Updated dependencies [413d6b4]
- Updated dependencies [65bf5be]
  - @use-voltra/core@2.3.0

## 2.2.0

### Patch Changes

- @use-voltra/core@2.2.0

## 2.0.0

### Minor Changes

- 9a0857d: Add an `accentedRenderingMode` prop to the iOS `Image` component for iOS 18+ Home Screen widgets. When the widget renders in `accented` or `vibrant` mode, the prop maps to SwiftUI's `widgetAccentedRenderingMode(_:)` so consumers can opt individual images out of the system's default desaturation (e.g. pass `"fullColor"` to keep an image's original colors over the tinted backdrop). It is a no-op on iOS &lt; 18, in Live Activities, and in `fullColor` widget mode.
- 948eb15: Add SVG support to image preloading on iOS and Android.

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/core@1.4.1

## 1.4.0

### Minor Changes

- Work on decomposing Voltra into smaller packages continues, and more pieces have moved from the umbrella package into the respective `@use-voltra/*` packages. You should still use the `voltra` umbrella for your app.

### Patch Changes

- Updated dependencies
  - @use-voltra/core@1.4.0

## 1.3.0

### Minor Changes

- 27e3db1: Add chart components for iOS and Android widgets and Live Activities, including bar, line, area, point, rule, and pie/donut charts.
- 672d91f: Add support for server-driven Home Screen widgets on iOS and Android, so widgets can refresh with content from your backend even when the app is closed.

### Patch Changes

- 0d30973: Fixed duplicate push-to-start token events being fired when a Live Activity starts or ends. Previously, iOS would re-deliver the same token on activity lifecycle changes, causing spurious token update callbacks to reach JavaScript. These duplicates are now suppressed.

  Fixed image preloading to correctly propagate errors so callers receive accurate failure information when images cannot be downloaded or saved.

- b1efcad: Fix timer digits shifting during countdown and stopwatch in relative mode.
