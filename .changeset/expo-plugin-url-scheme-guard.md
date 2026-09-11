---
'@use-voltra/ios-client': patch
---

Fix the iOS config plugin dropping the app's URL schemes from `Info.plist`. `ensureURLScheme`
wrote `ios.infoPlist.CFBundleURLTypes`, which trips the property guard around Expo's own
`withScheme` mod: once that key is set, Expo stops writing `CFBundleURLTypes` altogether, so
`expo.scheme` never reached the built app and deep links into it failed. The plugin now only
tops up a `CFBundleURLTypes` list the app already owns, and reads array `scheme` / `ios.scheme`
values instead of falling back to the bundle identifier whenever `scheme` is not a string.
