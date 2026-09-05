---
'@use-voltra/android-client': minor
'@use-voltra/ios-client': minor
'@use-voltra/expo-plugin': minor
'@use-voltra/android': minor
'@use-voltra/ios': minor
'@use-voltra/core': minor
'voltra': minor
---

Dynamic Widgets can now be server-driven: give a widget both `entry` and `serverUpdate` and the device fetches a plain JSON object from your endpoint and hands it to the bundled JS as props, instead of your server having to run Voltra's renderer and return UI (issue #176). The backend can be written in any language.

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
