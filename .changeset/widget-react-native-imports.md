---
'@use-voltra/android-client': minor
'@use-voltra/ios-client': minor
'@use-voltra/expo-plugin': minor
'@use-voltra/compiler': minor
'@use-voltra/metro': minor
'voltra': minor
---

Widget files can now import `StyleSheet` and `Platform` from `react-native`, so widget styles
can live outside the element tree the same way they do elsewhere in an app. Previously any
import from `react-native` in a widget file failed `voltra apply` and `expo prebuild` with
`Unexpected token 'typeof'`, and Dynamic Widgets rejected the import at bundle time.

Inside a widget, `Platform.OS` is the platform being built for, and `StyleSheet.create` returns
the styles unchanged. Other `react-native` APIs — components, `Dimensions`, `Animated`,
`PixelRatio`, deep `react-native/...` paths — now fail the build with a message naming the
symbol instead of misbehaving at render time.

Importing `@use-voltra/ios-client` or `@use-voltra/android-client` from a widget file now
resolves to the matching rendering package in `voltra apply` too, matching what prebuild
already did.
