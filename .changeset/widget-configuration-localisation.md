---
'@use-voltra/expo-plugin': minor
'@use-voltra/ios-client': minor
'@use-voltra/android-client': minor
'voltra': minor
---

The Edit Widget sheet can be translated. `appIntent.parameters[].title` accepts locale maps like
`displayName`, and a parameter can list `options` (`[{ "value": "metric", "title": "Metric" }]`),
which iOS shows as a picker while `env.configuration` still receives the `value`. On Android the
same titles are stored as string resources for a configuration screen you build in the app.

Widgets now declare the same languages as the app, taken from the Expo `locales` config,
`ios.infoPlist.CFBundleLocalizations`, widget locale maps and the app's development language. On
iOS this decides which language `env.locale` resolves to; before, only languages with a translated
gallery label counted.
