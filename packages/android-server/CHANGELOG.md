# @use-voltra/android-server

## 2.4.0

### Minor Changes

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

### Patch Changes

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
- Updated dependencies [aa1de8a]
- Updated dependencies [9560324]
- Updated dependencies [3b93020]
- Updated dependencies [a268ec2]
- Updated dependencies [9acf6c1]
- Updated dependencies [8beedea]
  - @use-voltra/android@2.4.0
  - @use-voltra/core@2.4.0
  - @use-voltra/server@2.4.0

## 2.3.2

### Patch Changes

- Updated dependencies [910e7fe]
- Updated dependencies [3ba1b1b]
  - @use-voltra/core@2.3.2
  - @use-voltra/android@2.3.2
  - @use-voltra/server@2.3.2

## 2.3.1

### Patch Changes

- @use-voltra/android@2.3.1
- @use-voltra/core@2.3.1
- @use-voltra/server@2.3.1

## 2.3.0

### Patch Changes

- Updated dependencies [a101612]
- Updated dependencies [6e4dad1]
- Updated dependencies [b856fa7]
- Updated dependencies [413d6b4]
- Updated dependencies [65bf5be]
  - @use-voltra/android@2.3.0
  - @use-voltra/core@2.3.0
  - @use-voltra/server@2.3.0

## 2.2.0

### Patch Changes

- Updated dependencies [6ee694b]
  - @use-voltra/android@2.2.0
  - @use-voltra/core@2.2.0
  - @use-voltra/server@2.2.0

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/android@1.4.1
  - @use-voltra/core@1.4.1
  - @use-voltra/server@1.4.1

## 1.4.0

### Minor Changes

- Android home-screen widgets can use colors that follow the user’s theme and wallpaper (including Material You), so widgets feel native in light, dark, and dynamic setups. If you drive widgets from your own server, you can read the full request URL—including query parameters—when handling updates, which makes it easier to personalize or A/B content per link. Widget updates on iOS are a bit more forgiving when variant data is missing.
- 14d4fa5: Add Android ongoing notification support, including richer notification content, remote update flows, and server-side payload rendering APIs. This release also expands the Expo integration and documentation so apps can configure, send, and manage Android ongoing notifications more easily.

### Patch Changes

- Updated dependencies
- Updated dependencies [14d4fa5]
- Updated dependencies
  - @use-voltra/android@1.4.0
  - @use-voltra/server@1.4.0
  - @use-voltra/core@1.4.0

## 1.3.0

### Minor Changes

- 672d91f: Add support for server-driven Home Screen widgets on iOS and Android, so widgets can refresh with content from your backend even when the app is closed.

### Patch Changes

- Updated dependencies [672d91f]
  - @use-voltra/server@1.3.0
