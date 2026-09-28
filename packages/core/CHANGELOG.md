# @use-voltra/core

## 2.3.2

### Patch Changes

- 910e7fe: Shared plumbing types (`EventSubscription`, the `PreloadImage*` types, and the
  `WidgetServer*` types) now have one canonical definition in `@use-voltra/core` instead of
  duplicated copies in `@use-voltra/ios` and `@use-voltra/android`. Import surfaces are unchanged:
  both platform packages still export these names, and `UpdateWidgetOptions` remains iOS-only.
- 3ba1b1b: The hot-reload hook used by both platforms is now a single shared implementation in
  @use-voltra/core, re-exported by the iOS and Android packages instead of being duplicated in
  each client. No API changes for apps.

## 2.3.1

## 2.3.0

### Minor Changes

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

## 2.2.0

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.

## 1.4.0

### Minor Changes

- Work on decomposing Voltra into smaller packages continues, and more pieces have moved from the umbrella package into the respective `@use-voltra/*` packages. You should still use the `voltra` umbrella for your app.
