# ADR 0015: Android ongoing notification event actions, direct reply, tap and dismiss events

Status: Accepted

Resolves [#316](https://github.com/callstackincubator/voltra/issues/316). Builds on the Android event
channel of [ADR 0014](0014-android-event-channel-and-widget-lifecycle-events.md), and adds the
headless start that ADR 0014 leaves to #316.

## Introduction

An Android ongoing notification action could only open an Activity through a deep link. A press could
not run app code, there was no direct reply, and the app never learned that the notification was
pressed, tapped or swiped away. iOS meets the same need with `interaction` events from Live Activity
buttons.

## Decision

The decisions are the ones #316 specifies. This section records them briefly, together with the
places where the implementation had to choose.

### Two exclusive action forms in one component

`AndroidOngoingNotification.Action` takes either `deepLinkUrl` (unchanged) or `actionId` with an
optional string `payload` and `remoteInput`. Both forms take `authenticationRequired` and
`semanticAction`. The forms are exclusive in the types and in the renderer, which throws for both,
neither, an empty `actionId`, `remoteInput` or `payload` on a deep link action, an empty
`remoteInput.key`, malformed `choices`, a non-string `payload`, and an unknown `semanticAction`. It
also throws for `allowFreeFormInput: false` without `choices`, which Android's `RemoteInput.Builder`
rejects at build time.

The payload stays flat and `v: 1`: an action has only the keys that were set, and an existing
`{ title, deepLinkUrl, icon }` action serialises byte-for-byte as before. One press cannot both open
the app and emit an event: on Android 12+ a receiver used by a notification may not start an
Activity.

### Event actions target a receiver

A deep link action stays an Activity PendingIntent. An event action is a broadcast PendingIntent to
`VoltraOngoingNotificationActionReceiver`, with the action `voltra.action.ONGOING_NOTIFICATION_ACTION`,
the data URI `voltra://ongoing-notification/{notificationId}/actions/{index}`, and extras naming the
notification, the action, its slot, its payload, its reply key and the record's revision. It reuses
the existing request-code scheme. It is `FLAG_IMMUTABLE`, except with a reply field: then
`FLAG_MUTABLE` on API 31+ and no mutability flag below, since the platform writes the reply into the
intent.

The receiver drops a press on a stopped or dismissed notification, reads the reply, posts the
notification again from its last payload when there is a reply, records an `interaction` event with
`VoltraEventBus.send`, then asks `VoltraHeadlessEventStarter` whether to start JavaScript (below). It
never starts an Activity, never waits for JavaScript and never uses `goAsync()`.

### Events are ADR 0014 channel events

#316 was written against a channel with typed `VoltraEvent` subclasses and `toMap`/`fromMap` because
the old bus carried only primitives. ADR 0014's channel stores each event as one JSON object, so
`OngoingNotificationEvents` builds plain `VoltraEvent(type, source, fields)` values instead:

- `interaction`: `identifier`, `payload`, `notificationId`, `revision`, and a nested
  `reply: { key, text, source }` when there is a reply. Nothing is flattened.
- `notificationDismissed` and `notificationTapped`: `notificationId`.

Every one uses the notification id as `source`; the queue adds `type`, `source` and `timestamp`
(epoch milliseconds). #316's round-trip requirement (24) is tested through `send` and `pop`, with a
multi-line reply and a payload containing `/` and quotes.

On Android, `addVoltraListener` routes the three types to the channel dispatcher, next to the widget
lifecycle types. On iOS these names warn and return a no-op subscription. `VoltraView` no longer
subscribes to `interaction` on Android, where views emit no interactions: its subscriber would take
notification presses from the queue and filter them out.

The queue keeps types without a rule for 15 minutes, as iOS keeps interactions. The three
notification types keep that rule. #316 asks for an event to survive "until a listener consumes it",
but a press that waited longer would act on a notification the user has moved on from, and
`getAndroidOngoingNotificationStatus().isDismissed` remains the durable record of a dismissal.
Notification events have no coalescing key: two presses are two events.

### A press starts JavaScript in the background

ADR 0014's channel never starts the JavaScript runtime. An action press must, without an Activity, so
the action receiver calls `VoltraHeadlessEventStarter.startIfNeeded` after recording the event:

- **Foreground: nothing is started.** The app's JavaScript pulls the event on the channel's signal,
  and React Native refuses a headless task in a resumed app.
- **Otherwise: `VoltraHeadlessEventService` is started,** even when a React instance is alive in the
  background. A background process can be frozen as soon as the receiver returns, before JavaScript
  pulls; the foreground service keeps it running until the listeners finish, and
  `HeadlessJsTaskService` reuses an existing React context. The wake lock is taken in `onReceive`,
  as React Native's headless docs require.
- The service is a `HeadlessJsTaskService` started with `startForegroundService`. A press on a
  notification action is an exemption from Android 12's background foreground-service start
  restriction. It promotes itself with the `shortService` type, which needs no type-specific
  permission, and shows a silent "Handling notification action" notification. A start that fails
  (for example `ForegroundServiceStartNotAllowedException`) is logged; the event stays queued.
- The `VoltraEvents` task, registered by the package entry point, calls the channel's
  `drainChannelEvents()`: it pulls now, then waits until every promise a listener returned has
  settled. Loading the bundle has already registered the app's module-scope listeners. Without an
  `interaction` listener it warns and the event stays queued.
- Dismissals and taps never start it.

The Expo plugin adds the service, `FOREGROUND_SERVICE` and `WAKE_LOCK` under `enableNotifications`.

`stopOngoingNotification` and `endAllOngoingNotifications` cancel the broadcast PendingIntent of
every slot and the Activity PendingIntent of each deep link in the last payload, looked up with
`FLAG_NO_CREATE`, so a button in a shade that has not refreshed yet cannot fire after a stop.

### Records keep the last payload and a revision

`AndroidOngoingNotificationRecord` gains `lastPayload` and `revision`. A start sets the revision to 1
and every update increments it. The repost after a reply uses the stored payload and keeps the
revision. Event action intents carry the revision of the post that drew them, so the event names the
buttons the user saw, and the app can ignore a press on an older version.

### Direct reply reposts before JavaScript runs

The repost happens in the receiver, before the event is sent, with `onlyAlertOnce`, so the reply
spinner clears even while background JavaScript is still starting. It never runs for a missing or
dismissed record (the Live Updates rule "Don't repost Live Updates that the user dismissed"). The
reply reaches JavaScript as `reply: { key, text, source }`. `RemoteInput.getResultsSource` exists
only from API 28, so below it every reply reports `source: 'freeForm'`.

### `authenticationRequired` and `semanticAction` are gated by API level

`setAuthenticationRequired` is applied on API 31+ and `setSemanticAction` on API 28+; both are
ignored below. An unknown semantic name, which only a newer renderer could send, maps to
`SEMANTIC_ACTION_NONE`. `getAndroidOngoingNotificationCapabilities()` reports both gates, and the
JavaScript getter reports them as `false` for a native build that predates them.

### Dismissal and tap events

`VoltraOngoingNotificationDismissedReceiver` keeps marking the record dismissed and then sends
`notificationDismissed`. App-initiated stops send nothing. ADR 0012's internal "ended" signal for the
hook is unchanged.

The content tap stays an Activity PendingIntent and carries `voltra.extra.NOTIFICATION_ID` and
`voltra.extra.TAPPED`. `VoltraModule` reads them from the launch intent when it initialises (cold
start) and from `onNewIntent` (warm start), sends `notificationTapped` once, and strips the marker so
a re-delivered intent does not report the tap again.

#316 describes the tap event as hot-path only, not persisted. ADR 0014's channel has no hot path:
every event is recorded and pulled. That also suits a cold start, where the module reads the launch
intent before any JavaScript listener exists. A queued tap reaches the `notificationTapped`
listeners like every other event.

### Malformed payloads still reject with the existing code

#316 requires a payload with an action that has neither `deepLinkUrl` nor `actionId` to fail with an
`IllegalArgumentException` before anything is posted. The action payload's `init` block throws one
with `require`. As with every other decoding failure, the parser wraps it in
`VoltraNotificationException(VOLTRA_NOTIFICATION_INVALID_PAYLOAD)`, whose cause it is, so JavaScript
callers keep the documented rejection code.

### End-to-end checks cannot use force-stop

#316 requirement 27 describes force-stopping the app before pressing "Pause". `am force-stop` removes
the app's notifications and blocks its broadcasts until the next launch, so there is nothing to
press. The process is killed with `kill -9` (through `run-as`) instead, which leaves the
notification and the receiver in place, as a system kill under memory pressure does.

## Consequences

- Apps can handle "Pause", "Add tip" or "Stop navigation" from the notification shade without the app
  coming to the foreground, including when its process was dead. Android shows a short, silent
  notification while that background run lasts.
- An event that finds no listener for 15 minutes is dropped.
- A server pushing to a mixed fleet must keep sending deep-link-only actions to app builds from before
  this change: those builds require `deepLinkUrl` and fail to parse an `actionId` action.
- Records grow by the last payload's JSON.
- A deep link slot that switches to an event action across updates leaves its old Activity
  PendingIntent behind until the system drops it; a stop cannot look it up without the old URL.
