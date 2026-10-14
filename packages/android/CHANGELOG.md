# @use-voltra/android

## 2.4.0

### Minor Changes

- aa1de8a: Android ongoing notifications now cover the Android 16 Live Updates surface. `chronometer`
  accepts `'countDown'` (with `when`) so the status-bar chip can count remaining time,
  promotion requests reach the system even before the user enables Live Updates, and results
  report promotion eligibility as machine-readable reasons. New helpers:
  `checkAndroidOngoingNotificationPromotion()` pre-flights a payload without posting, and
  `openAndroidPromotedNotificationSettings()` opens the Live Updates settings page. Posting
  now rejects with coded errors (`VOLTRA_NOTIFICATION_...`) for a missing or unknown channel,
  a malformed remote payload, or — with `fallbackBehavior: 'error'` — an ineligible promoted
  notification, instead of failing silently or leaking raw exceptions. In
  `useAndroidOngoingNotification`, an `autoStart` or `autoUpdate` that now rejects (for those
  same coded reasons) is reported through `console.error` instead of surfacing as an
  unhandled promise rejection.
- 9560324: New `AndroidOngoingNotification.Metric` layout for ongoing notifications: up to three
  readings (numbers, text, clock times, live timers and stopwatches) with a highlighted
  critical metric and a semantic style (`info`, `safe`, `caution`, `danger`). It renders as
  the Android 17 metric notification, and as a plain notification whose text line joins the
  readings on older versions — the result then says `styleFallback: 'standard'` so apps and
  remote update handlers can tell. Metric notifications don't need a title to be eligible for
  Live Update promotion. The metric layout is used when the app compiles
  against SDK 37; apps that compile against SDK 36 keep building and get the text fallback.
- 3b93020: Android ongoing notifications can now be presented the way the platform allows: choose lock-screen
  visibility with a public version for the private content, an accent color, a notification category, a
  timeout that removes a stale notification, local-only delivery, and a group with a sort key. Updates
  can re-alert once with `alert`, and `showWhen` keeps a timestamp for ordering without showing it.
- a268ec2: Every Voltra component accepts a `modifiers` prop that applies platform-native modifiers on top of
  its style. `Voltra.modifiers` provides SwiftUI modifiers such as `widgetURL`, `containerBackground`,
  `privacySensitive`, `contentTransition` and `clipShape`; `VoltraAndroid.modifiers` provides Jetpack
  Glance modifiers such as `semantics`, `appWidgetBackground`, `background`, `size` and `visibility`.
  Passing a modifier from the other platform is a type error, and a modifier the device does not
  support is skipped instead of breaking the widget. Native modifiers are meant for Dynamic Widgets and
  Dynamic Live Activities; they count against the payload size limit of pushed updates.
- 9acf6c1: Ongoing notifications gained two layouts. `AndroidOngoingNotification.BigPicture` posts one image,
  with `picture`, an optional collapsed `largeIcon` thumbnail, `bigLargeIcon` or
  `hideLargeIconWhenExpanded` for the expanded state, `summaryText`, and the Android 12+
  `showPictureWhenCollapsed` and `pictureContentDescription` options. `AndroidOngoingNotification.Inbox`
  posts one to six short lines, with `text` defaulting to the first line. Both take action children,
  both render on the server with `renderAndroidOngoingNotificationPayload`, and both are ignored rather
  than fatal when the artwork cannot be decoded.

  A `bigPicture` or `inbox` payload is selected by its `kind`, so a remote payload using either one
  reaches only app builds that contain this release. Bundled drawables are handed to Android as
  resources; decoded artwork is downscaled to 1024 px on the long edge for a picture and 256 px for an
  icon before it is posted.

- 8beedea: Dynamic Widgets and Dynamic Live Activities receive the user's language and regional settings on
  `env`: `preferredLanguages`, `layoutDirection`, `hourCycle` (matching the 12/24-hour setting),
  `timeZone`, `measurementSystem`, `calendar` and `firstDayOfWeek`, alongside `locale`.
  `resolveLocale(env, messages)` picks the best translation with the same fallback order as
  localized initial states, and `pickLocalizedValue` is exported from `@use-voltra/core`,
  `@use-voltra/ios` and `@use-voltra/android`.

  `setDynamicWidgetLocale(tag | null)` renders widgets in a language the app chooses. The tag reaches
  every render as `env.appLocale`, and placed widgets and running Dynamic Live Activities render
  again at once. On iOS it needs `groupIdentifier` in the plugin configuration.

  Android Dynamic Widgets render again after the device language, the app's per-app language or the
  regional preferences change, even when the app is not running. A light/dark or language change
  within 45 seconds of the last render now renders the widget again; before, it was ignored.

### Patch Changes

- Updated dependencies [a268ec2]
- Updated dependencies [8beedea]
  - @use-voltra/core@2.4.0

## 2.3.2

### Patch Changes

- 910e7fe: Shared plumbing types (`EventSubscription`, the `PreloadImage*` types, and the
  `WidgetServer*` types) now have one canonical definition in `@use-voltra/core` instead of
  duplicated copies in `@use-voltra/ios` and `@use-voltra/android`. Import surfaces are unchanged:
  both platform packages still export these names, and `UpdateWidgetOptions` remains iOS-only.
- 3ba1b1b: The hot-reload hook used by both platforms is now a single shared implementation in
  @use-voltra/core, re-exported by the iOS and Android packages instead of being duplicated in
  each client. No API changes for apps.
- Updated dependencies [910e7fe]
- Updated dependencies [3ba1b1b]
  - @use-voltra/core@2.3.2

## 2.3.1

### Patch Changes

- @use-voltra/core@2.3.1

## 2.3.0

### Minor Changes

- a101612: Add `VoltraAndroid.ArcProgressIndicator`, a determinate arc gauge for Android
  widgets: a partial ring that fills clockwise, with configurable stroke width,
  start and sweep angles, rounded or flat ends, an optional sweep gradient, and
  children centered inside the arc. It is the first determinate circular
  indicator Voltra can draw on Android, and it renders on every supported
  Android version.
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

- 6ee694b: Android widgets now warn you when a Column or Row has more children than can be displayed.
  - @use-voltra/core@2.2.0

## 2.0.0

### Minor Changes

- 948eb15: Add SVG support to image preloading on iOS and Android.

### Patch Changes

- 1e014f1: Remove unsupported margin properties from Android widget style types.

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/core@1.4.1

## 1.4.0

### Minor Changes

- Android home-screen widgets can use colors that follow the user’s theme and wallpaper (including Material You), so widgets feel native in light, dark, and dynamic setups. If you drive widgets from your own server, you can read the full request URL—including query parameters—when handling updates, which makes it easier to personalize or A/B content per link. Widget updates on iOS are a bit more forgiving when variant data is missing.
- 14d4fa5: Add Android ongoing notification support, including richer notification content, remote update flows, and server-side payload rendering APIs. This release also expands the Expo integration and documentation so apps can configure, send, and manage Android ongoing notifications more easily.
- Work on decomposing Voltra into smaller packages continues, and more pieces have moved from the umbrella package into the respective `@use-voltra/*` packages. You should still use the `voltra` umbrella for your app.

### Patch Changes

- Updated dependencies
  - @use-voltra/core@1.4.0

## 1.3.0

### Minor Changes

- 2585b90: Adds the ability to render text with custom fonts in Android Glance widgets using a bitmap rendering approach.
- 27e3db1: Add chart components for iOS and Android widgets and Live Activities, including bar, line, area, point, rule, and pie/donut charts.
- 672d91f: Add support for server-driven Home Screen widgets on iOS and Android, so widgets can refresh with content from your backend even when the app is closed.

### Patch Changes

- 64a7f4b: Fix text truncation and blank preview issues with the VoltraWidgetPreview for Android.
