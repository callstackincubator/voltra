---
'@use-voltra/ios-client': minor
---

Read Live Activity push state at any time: `getLiveActivityPushTokens()` returns the push token of every running Live Activity, `getLiveActivityPushToStartToken()` returns the push-to-start token, and `areLiveActivitiesEnabled()` reports whether the user allows Live Activities. A new `activityEnablementChanged` event fires when that setting changes.

Button and toggle taps are no longer delivered twice. A tap your app already handled is not replayed on the next launch or reload, and a tap that launches your app is delivered once, to the first `interaction` listener that attaches.
