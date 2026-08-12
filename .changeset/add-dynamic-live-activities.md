---
'@use-voltra/ios-client': minor
'@use-voltra/expo-plugin': minor
'@use-voltra/metro': minor
'@use-voltra/ios': minor
---

Add Dynamic Live Activities (experimental): bundle a Live Activity's rendering
definition in the app and drive it with a small JSON props record instead of a
fully rendered payload on every update. Configure definitions via the iOS
plugin's `liveActivities` option, start and update them with the new
`getDynamicLiveActivityDefinitionIds`, `startDynamicLiveActivity`, and
`updateDynamicLiveActivity` APIs, and iterate with hot reload and push
updates through Metro's dedicated Dynamic Live Activity pipeline.
