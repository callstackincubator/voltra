# @use-voltra/ios

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
