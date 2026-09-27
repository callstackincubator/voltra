---
'@use-voltra/expo-plugin': minor
'@use-voltra/ios-client': minor
'@use-voltra/android-client': minor
'voltra': minor
---

The Edit Widget sheet can be localized: `appIntent.parameters[].title` and the new
`configurationTitle` accept locale maps like `displayName`, and parameters accept static `options`,
which iOS shows as a picker while `env.configuration` still receives the raw value. On Android the
same strings are written to `voltra_widgets.xml` for an in-app configuration screen.

The generated iOS widget extension now declares the app's languages (from the Expo `locales` config,
`CFBundleLocalizations` and widget locale maps), so the extension, and `env.locale`, resolve the
same language as the app instead of only the languages that happen to have a localized gallery
label.
