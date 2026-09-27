---
'@use-voltra/core': minor
'@use-voltra/ios': minor
'@use-voltra/android': minor
'@use-voltra/ios-client': minor
'@use-voltra/android-client': minor
---

Dynamic Widgets and Dynamic Live Activities receive a complete locale environment:
`env.preferredLanguages`, `env.layoutDirection`, `env.hourCycle` (reconciled with the user's
12/24-hour setting), `env.timeZone`, `env.measurementSystem`, `env.calendar` and
`env.firstDayOfWeek`, alongside `env.locale`. `resolveLocale(env, messages)` picks the best
translation with the same fallback order as localized initial states, and `pickLocalizedValue` is
now exported from `@use-voltra/core`, `@use-voltra/ios` and `@use-voltra/android`.

`setDynamicWidgetLocale(tag | null)` lets an app render widgets in a language it chooses; the tag
reaches every render as `env.appLocale`. On iOS it is stored in the App Group and needs
`groupIdentifier`. Android Dynamic Widgets now re-render after a device, per-app or regional
language change, even when the app is not running.
