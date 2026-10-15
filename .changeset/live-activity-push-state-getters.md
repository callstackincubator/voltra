---
'@use-voltra/ios-client': minor
---

Read Live Activity push state at any time: `getLiveActivityPushTokens()` returns the push token of every running Live Activity, `getLiveActivityPushToStartToken()` returns the push-to-start token, and `areLiveActivitiesEnabled()` reports whether the user allows Live Activities. A new `activityEnablementChanged` event fires when that setting changes.

Button and toggle taps (`interaction` events) are now delivered exactly once. A tap your app already handled is no longer replayed on the next launch or reload, and a tap made while your app was killed or in the background arrives once your `interaction` listener is attached and the app is running. Taps are kept for up to 15 minutes (the 100 most recent), each event carries a unique `id`, and a mounted `VoltraView` no longer takes taps meant for your Live Activities. Taps queued by an earlier release are discarded on upgrade. Code that subscribed to `getNativeVoltra().onInteraction` directly must switch to `addVoltraListener('interaction')`.
