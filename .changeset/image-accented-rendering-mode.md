---
'@use-voltra/ios-client': minor
'@use-voltra/ios': minor
---

Add an `accentedRenderingMode` prop to the iOS `Image` component for iOS 18+ Home Screen widgets. When the widget renders in `accented` or `vibrant` mode, the prop maps to SwiftUI's `widgetAccentedRenderingMode(_:)` so consumers can opt individual images out of the system's default desaturation (e.g. pass `"fullColor"` to keep an image's original colors over the tinted backdrop). It is a no-op on iOS &lt; 18, in Live Activities, and in `fullColor` widget mode.
