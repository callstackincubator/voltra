# @use-voltra/ios-server

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/core@1.4.1
  - @use-voltra/ios@1.4.1
  - @use-voltra/server@1.4.1

## 1.3.2

### Patch Changes

- Android home-screen widgets can use colors that follow the user’s theme and wallpaper (including Material You), so widgets feel native in light, dark, and dynamic setups. If you drive widgets from your own server, you can read the full request URL—including query parameters—when handling updates, which makes it easier to personalize or A/B content per link. Widget updates on iOS are a bit more forgiving when variant data is missing.
- Updated dependencies
- Updated dependencies
  - @use-voltra/server@1.4.0
  - @use-voltra/core@1.4.0
  - @use-voltra/ios@1.4.0

## 1.3.0

### Minor Changes

- 672d91f: Add support for server-driven Home Screen widgets on iOS and Android, so widgets can refresh with content from your backend even when the app is closed.

### Patch Changes

- Updated dependencies [27e3db1]
- Updated dependencies [672d91f]
- Updated dependencies [0d30973]
- Updated dependencies [b1efcad]
  - @use-voltra/ios@1.3.0
  - @use-voltra/server@1.3.0
