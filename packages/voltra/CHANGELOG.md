# voltra

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/android@1.4.1
  - @use-voltra/android-client@1.4.1
  - @use-voltra/android-server@1.4.1
  - @use-voltra/core@1.4.1
  - @use-voltra/expo-plugin@1.4.1
  - @use-voltra/ios@1.4.1
  - @use-voltra/ios-client@1.4.1
  - @use-voltra/ios-server@1.4.1
  - @use-voltra/server@1.4.1

## 1.4.0

### Minor Changes

- Android home-screen widgets can use colors that follow the user’s theme and wallpaper (including Material You), so widgets feel native in light, dark, and dynamic setups. If you drive widgets from your own server, you can read the full request URL—including query parameters—when handling updates, which makes it easier to personalize or A/B content per link. Widget updates on iOS are a bit more forgiving when variant data is missing.
- 14d4fa5: Add Android ongoing notification support, including richer notification content, remote update flows, and server-side payload rendering APIs. This release also expands the Expo integration and documentation so apps can configure, send, and manage Android ongoing notifications more easily.

### Patch Changes

- Android apps built for production (minified / release) are less likely to crash or mis-render widgets because of how widget payloads are processed on the device.
- 8cedb47: Fix iOS Live Activity naming so named activities can be reused more reliably across app launches.
- Work on decomposing Voltra into smaller packages continues, and more pieces have moved from the umbrella package into the respective `@use-voltra/*` packages. You should still use the `voltra` umbrella for your app.
- Updated dependencies
- Updated dependencies [14d4fa5]
- Updated dependencies
  - @use-voltra/android@1.4.0
  - @use-voltra/android-server@1.4.0
  - @use-voltra/ios-server@1.3.2
  - @use-voltra/server@1.4.0
  - @use-voltra/expo-plugin@1.4.0
  - @use-voltra/android-client@1.4.0
  - @use-voltra/core@1.4.0
  - @use-voltra/ios@1.4.0
  - @use-voltra/ios-client@1.4.0

## 1.3.0

### Patch Changes

- Updated dependencies [2585b90]
- Updated dependencies [27e3db1]
- Updated dependencies [68271bb]
- Updated dependencies [64a7f4b]
- Updated dependencies [672d91f]
- Updated dependencies [0d30973]
- Updated dependencies [b1efcad]
  - @use-voltra/android@1.3.0
  - @use-voltra/ios@1.3.0
  - @use-voltra/expo-plugin@1.3.0
  - @use-voltra/ios-server@1.3.0
  - @use-voltra/android-server@1.3.0
  - @use-voltra/server@1.3.0
