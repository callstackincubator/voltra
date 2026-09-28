---
'@use-voltra/core': minor
'@use-voltra/ios': minor
'@use-voltra/android': minor
'@use-voltra/ios-client': minor
'@use-voltra/android-client': minor
---

Dynamic Widgets and Dynamic Live Activities receive the user's language and regional settings on
`env`: `preferredLanguages`, `layoutDirection`, `hourCycle` (matching the 12/24-hour setting),
`timeZone`, `measurementSystem`, `calendar` and `firstDayOfWeek`, alongside `locale`.
`resolveLocale(env, messages)` picks the best translation with the same fallback order as
localized initial states, and `pickLocalizedValue` is exported from `@use-voltra/core`,
`@use-voltra/ios` and `@use-voltra/android`.

`setDynamicWidgetLocale(tag | null)` renders widgets in a language the app chooses. The tag reaches
every render as `env.appLocale`, and placed widgets and running Dynamic Live Activities render
again at once. On iOS it needs `groupIdentifier` in the plugin configuration.

Android Dynamic Widgets render again after the device language, the app's per-app language or the
regional preferences change, even when the app is not running. A light/dark or language change
within 45 seconds of the last render now renders the widget again; before, it was ignored.
