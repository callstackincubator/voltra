# @use-voltra/android

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
