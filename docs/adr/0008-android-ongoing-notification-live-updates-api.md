# ADR 0008: Android ongoing notification Live Updates API surface

Status: Accepted

Implemented by #325 (promotion request, status-bar chip, eligibility and
error codes) and #326 (Metric payload kind and the compileSdk 37 floor).

Resolves [#322](https://github.com/callstackincubator/voltra/issues/322).

## Introduction

Android 16 (API 36) turns ongoing notifications into Live Updates: promotable
notifications expand in the status bar into a chip with a countdown or a
short critical text. Voltra's ongoing notifications already do most of what
the platform asks for — `setOngoing(true)`, `setOnlyAlertOnce` on updates, a
persistent dismissed state, `ProgressStyle` on API 36 — but five things were
imprecise or missing, each one deciding whether the chip, the promotion
request, and the failure modes behave as documented:

1. The chip could only count up (`setUsesChronometer` without
   `setChronometerCountDown`), so an ETA or a parking meter could not be
   expressed.
2. The promotion request was gated on the user having already enabled Live
   Updates, which is exactly the case where it must be set so the next update
   is promoted without an app change.
3. The settings helper opened the channel list, not the promotion settings
   page.
4. Nothing was validated before posting: a missing channel dropped the
   notification silently, and several errors escaped the TurboModule as raw
   Kotlin exceptions instead of promise rejections.
5. `Notification.MetricStyle` (API 37), the Live Update style for workouts,
   timers and navigation, could not be expressed at all.

## Decision

### The promotion request is an extras bit, written whenever it is requested

The promotion mechanism is `Notification.EXTRA_REQUEST_PROMOTED_ONGOING`
(`"android.requestPromotedOngoing"`). The module writes it on every API 36+
post when `requestPromotedOngoing: true`, regardless of
`NotificationManager.canPostPromotedNotifications()`. The platform decides
promotion at post time from the bit plus the user preference; writing the bit
while the preference is off is harmless and means a user who enables Live
Updates in Settings sees the next update promoted with no app change. The
alternative — gating the write on the preference — would make the
first-promotion case impossible without a re-post.

`Builder.setRequestPromotedOngoing` only exists in SDK 36.1, so the extras
key is the mechanism on 36.0 devices too. Because the module compiles against
SDK 37 (below), the code references the typed constant, and a test pins its
value to the documented string.

### Promotion eligibility is a reason list on the result, with an opt-in error

Every `ok: true` start/update/upsert result made with
`requestPromotedOngoing: true` carries:

```ts
promotion?: {
  requested: boolean
  eligible: boolean // requested && reasons.length === 0
  reasons: AndroidOngoingNotificationPromotionIssue[]
  hasPromotableCharacteristics?: boolean // API 36+ only, from the built Notification
}
```

The issue vocabulary is a closed set of strings
(`'unsupported_api_level' | 'permission_not_declared' | 'notifications_disabled'
| 'promotion_disabled_by_user' | 'channel_importance_min' | 'missing_title'
| 'not_promotable'`). A list on a successful result is what remote update
handlers can log; `fallbackBehavior: 'error'` keeps the hard-failure option
and rejects with `VOLTRA_NOTIFICATION_NOT_PROMOTABLE` listing the same
reasons. Group summary, colorized notifications and custom `RemoteViews` are
not runtime checks because Voltra never sets them; tests pin that
structurally instead.

`checkAndroidOngoingNotificationPromotion(input, options)` runs the same
evaluation without posting: it builds the notification (so
`hasPromotableCharacteristics()` is available) and writes no record.

### The countdown chip is a JS-side widening, a payload-side optional field

`chronometer` widens to `boolean | 'countUp' | 'countDown'` on the props
(`true` keeps meaning `'countUp'`). The payload keeps `chronometer?: boolean`
and adds optional `chronometerCountDown?: boolean`, emitted only when true.
This is an additive optional field, so the payload version stays at 1, and an
older client ignores the key and counts up — the least surprising degrade.
A countdown without `when` has nothing to count down to and is rejected on
both sides. `setChronometerCountDown` is API 24, Voltra's `minSdk`, so the
native call needs no gate.

### Posting validates, and failures are coded rejections

Before `notify()`, every post (start, update, upsert) checks: a channel id is
present (`VOLTRA_NOTIFICATION_CHANNEL_REQUIRED`), the channel exists on
API 26+ (`VOLTRA_NOTIFICATION_CHANNEL_NOT_FOUND` — previously a silent
system-service drop), and the payload parses and satisfies its constraints
(`VOLTRA_NOTIFICATION_INVALID_PAYLOAD`). No ongoing-notification TurboModule
method lets a Kotlin exception escape; each resolves a result or rejects with
one of these codes, `VOLTRA_NOTIFICATION_NOT_PROMOTABLE`, or
`VOLTRA_NOTIFICATION_INTERNAL_ERROR` as the catch-all. The channel-existence
check turns a silent drop into a rejection for every post, not only promoted
ones: the docs already require the app to create the channel, and failing
loudly is the right default.

`getAndroidOngoingNotificationStatus` stops coercing `null` to `false`:
`isPromoted` and `hasPromotableCharacteristics` are `undefined` below API 36,
so "not promotable" and "unknown" stay distinguishable.

### The settings helpers split by destination

`openAndroidNotificationSettings()` keeps opening the app notification
(channel list) page. A new `openAndroidPromotedNotificationSettings():
Promise<boolean>` opens `Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS`
on API 36+ when an activity resolves it, and falls back to the app
notification settings returning `false`. (The Live Update guide names an
`ACTION_MANAGE_APP_PROMOTED_NOTIFICATIONS` constant; it does not exist in the
`Settings` reference or any shipped jar.)

### Metric is a third payload kind, rendered with MetricStyle from API 37

`AndroidOngoingNotification.Metric` adds a payload `kind: 'metric'` with
1..3 metrics (`label` 1..10 characters), a `criticalMetric` index, and
values in eight forms (int, float, text, time of day, timer, stopwatch,
paused timer, paused stopwatch) normalised to object form by the renderer.
MetricStyle requires `compileSdkVersion 37`, so the Gradle default moves to 37
with a configuration-time floor check that names the requirement, and the
render is gated on `SDK_INT >= 37`.

Below API 37 the payload posts a standard notification whose `contentText`
joins the metrics as `"<label> <value><unit>"` and the result carries
`styleFallback: 'standard'`. Refusing to post on older devices was rejected:
a remote server would have to care about the device API level. Reflection to
avoid the SDK 37 compile dependency was rejected: lint cannot check it and it
hides the requirement. `FixedDate` and `Notification.CallStyle` are out of
scope (CallStyle needs a `Person` model and PendingIntents that act without
opening the app; it gets its own issue).

### Encapsulation

Within `packages/android-client/android/src/main/java/voltra`:
`ongoingnotification/` owns the payload schema (including the metric value
sealed class), each payload's `validate()`, the promotion issue vocabulary
and evaluator, the MetricStyle/fallback renderer, and
`VoltraNotificationException` (exception + reject code in one type).
`VoltraNotificationManager` orchestrates: resolve record → validate → build →
evaluate promotion → post or reject, and shares one `buildNotification` path
with the pre-flight check. `VoltraModule` maps the typed exceptions to promise
reject codes. On the JS side the renderer, types and components stay in
`packages/android/src/ongoing-notification/`, the client wrappers in
`packages/android-client/src/ongoing-notification/`, re-exported through the
server package.

## Consequences

- A notification posted with `requestPromotedOngoing: true` becomes promoted
  as soon as the user enables Live Updates, without the app re-posting.
- Apps that posted to a non-existent channel and saw `ok: true` now get a
  rejection. This is the intended behavior change.
- `promotion.reasons` gives server-side update handlers a machine-readable
  diagnosis on the success path; the error mode stays opt-in.
- The chip can show remaining time (`chronometer: 'countDown'` with `when`);
  the docs state the platform precedence: `shortCriticalText` wins, then a
  critical metric, then time derived from `when`.
- Host apps must compile against SDK 37. The Gradle floor check fails
  configuration with a named message instead of a Kotlin resolution error.
- Metric notifications degrade to a one-line text summary with a
  `styleFallback` marker on API < 37 instead of failing.
