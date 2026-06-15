# @use-voltra/ios-client

## 2.0.0

### Major Changes

- 3833dfe: **Breaking change.** Voltra’s iOS native code now requires a **minimum deployment target of iOS 16.4** (bumped from the previous minimum). Raise it everywhere it matters (Xcode targets, `expo-build-properties`, CocoaPods, and CI), so you are not still building for 16.3 or lower.

  This release also brings **Expo SDK 56** compatibility; you can upgrade Expo on your own timeline and you **do not** need to be on SDK 56 before adopting this Voltra version.

### Minor Changes

- 9a0857d: Add an `accentedRenderingMode` prop to the iOS `Image` component for iOS 18+ Home Screen widgets. When the widget renders in `accented` or `vibrant` mode, the prop maps to SwiftUI's `widgetAccentedRenderingMode(_:)` so consumers can opt individual images out of the system's default desaturation (e.g. pass `"fullColor"` to keep an image's original colors over the tinted backdrop). It is a no-op on iOS &lt; 18, in Live Activities, and in `fullColor` widget mode.

### Patch Changes

- ef9f1da: Add a reactive `useIsHeadless()` helper for iOS headless launches and update iOS headless launch handling so apps can render again when users open them from a background launch.
- Updated dependencies [3833dfe]
- Updated dependencies [9a0857d]
- Updated dependencies [948eb15]
  - @use-voltra/expo-plugin@2.0.0
  - @use-voltra/ios@2.0.0

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/ios@1.4.1

## 1.4.0

### Minor Changes

- Work on decomposing Voltra into smaller packages continues, and more pieces have moved from the umbrella package into the respective `@use-voltra/*` packages. You should still use the `voltra` umbrella for your app.

### Patch Changes

- Updated dependencies
  - @use-voltra/ios@1.4.0
