---
'@use-voltra/core': minor
'@use-voltra/ios': minor
'@use-voltra/ios-client': minor
'@use-voltra/android': minor
'@use-voltra/android-client': minor
---

Every Voltra component accepts a `modifiers` prop that applies platform-native modifiers on top of
its style. `Voltra.modifiers` provides SwiftUI modifiers such as `widgetURL`, `containerBackground`,
`privacySensitive`, `contentTransition` and `clipShape`; `VoltraAndroid.modifiers` provides Jetpack
Glance modifiers such as `semantics`, `appWidgetBackground`, `background`, `size` and `visibility`.
Passing a modifier from the other platform is a type error, and a modifier the device does not
support is skipped instead of breaking the widget. Native modifiers are meant for Dynamic Widgets and
Dynamic Live Activities; they count against the payload size limit of pushed updates.
