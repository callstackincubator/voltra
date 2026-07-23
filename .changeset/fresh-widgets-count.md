---
'@use-voltra/android-client': minor
'@use-voltra/ios-client': minor
---

Add typed, JSON-serializable runtime-props update APIs for entry-based Dynamic Widgets on both platforms:

- Android adds `updateAndroidDynamicWidget`, persists the latest props per widget ID in private `SharedPreferences`, passes them into the Hermes render path, and refreshes only matching Glance receiver instances.
- iOS adds `updateDynamicWidget`, persists the latest props per widget ID in App Group `UserDefaults`, passes them into the JavaScriptCore/WidgetKit render path, and reloads only the matching WidgetKit kind.

Both platforms default to `{}` when no props are stored. On iOS, configure `groupIdentifier` so the app and WidgetKit extension can share runtime props. Rebuild the native Android and iOS apps after upgrading so the new TurboModule methods and native props persistence are included.
