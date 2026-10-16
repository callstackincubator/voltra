# ADR 0012: Android ongoing notification state after a dismissal

Status: Accepted

Partially supersedes [ADR 0010](0010-android-ongoing-notification-field-placement.md): its last
consequence ("a timed-out notification ... needs `stop` before it can start again") no longer
holds.

## Introduction

On Android 14 and later the user can swipe an ongoing notification away, and a notification posted
with `timeoutMs` is removed by the system when the timeout expires. Voltra records both: the
notification's delete intent reaches `VoltraOngoingNotificationDismissedReceiver`, which marks the
stored record `dismissed`. `getAndroidOngoingNotificationStatus()` then reports
`isActive: false, isDismissed: true`, and updates are rejected with `reason: 'dismissed'`.

`useAndroidOngoingNotification()` never finds out. Reproduced on an API 35 emulator with the hook
mounted:

1. After a swipe, or after a 10 s `timeoutMs` expired with the app in the foreground, the hook kept
   reporting `isActive: true` indefinitely. Its `isActive` is seeded once from the native status at
   mount and afterwards changes only through its own `start()` and `end()`.
2. `start()` resolved `{ ok: false, reason: 'already_exists' }` and posted nothing, because a
   dismissed record still counts as existing.
3. After a remount the hook reported `isActive: false`, but `start()` still failed with
   `already_exists`. `end()` then returned a client-side `not_found` without calling native code, so
   the hook had no way left to post a notification under that id.

The same `already_exists` applies to `startAndroidOngoingNotification()` called directly. ADR 0010
recorded that as a consequence: a timed-out notification has to be stopped before it can start
again.

## Context

The hook keeps a JavaScript copy of state that the device owns. The device can change that state
without any JavaScript call:

- **Swipe.** The user dismisses the notification. Pulling the shade down over the app and swiping
  there does not change `AppState`, so an `AppState` listener does not cover it.
- **Timeout.** The system removes the notification while the app may be in the foreground, with no
  user interaction at all. On the API 35 emulator the delete intent is delivered on timeout, so
  this arrives as a dismissal. That is the device check ADR 0010 left open.
- **Another caller.** `stopAndroidOngoingNotification()` or `endAllAndroidOngoingNotifications()`
  can run elsewhere in the app, for example in the handler for a remote push with
  `operation: 'stop'`.

A tap does not remove the notification: Voltra never sets `setAutoCancel` (ADR 0010), and action
buttons only open deep links. So there is no tap case to handle.

The device already persists the state. The record survives process death, so the getter is correct
on a cold start. What is missing is a signal while the app runs. Android has no native-to-JS event
channel today; every value crosses as a Promise result or a synchronous getter.

## Decision

### State is the getter plus an internal "ended" event

This follows the model [ADR 0011](0011-live-activity-push-state-getters-and-interaction-drain.md)
sets for iOS: the getter returns the current value, and an event reports changes. The TurboModule spec gains one codegen event emitter:

```ts
readonly onOngoingNotificationEnded: CodegenTypes.EventEmitter<{
  notificationId: string
  reason: string // 'dismissed' | 'stopped'
}>
```

Native code emits it when a record stops being live:

- `'dismissed'`, from `VoltraNotificationManager.markDismissed`, for a swipe or a timeout (both reach
  the delete intent);
- `'stopped'`, from `stopOngoingNotification`, and once per record from `endAllOngoingNotifications`.

`VoltraNotificationManager` keeps a process-wide set of listeners in its companion object, because
the broadcast receiver has no reference to the TurboModule. `VoltraModule` adds itself in
`initialize()` and removes itself in `invalidate()`. When no module is alive (the process was started
only for the broadcast), nothing is emitted, and the persisted record serves as the getter's answer
on the next launch.

The event is not queued. A queue is for things that happen once, like interactions in ADR 0011. A
dismissal is a state change, and the record already holds the latest state, so a listener that
missed the event reads the record instead.

The event is internal. Only the hook subscribes to it. It is not added to `addVoltraListener`, and
no public type changes. Making it public is a separate decision, with its own name and payload
shape.

### The hook subscribes first, then reads the getter

`useAndroidOngoingNotification` subscribes once when it mounts. When the event carries the id the
hook is managing, the hook clears that id and `isActive` becomes `false`. After subscribing, it
checks the native status once more, so a dismissal between the first render and the subscription is
not lost. This is the same subscribe-then-read order ADR 0011 documents.

Rejected: re-syncing on `AppState` changes alone. It misses a swipe made from the shade over the app
and a timeout with the app in the foreground; the reproduction above hit both. Polling was rejected
for the same reason: it is either slow or wasteful, and it is still wrong between polls.

### `start()` replaces a dismissed record

`startOngoingNotification` treats an existing record marked `dismissed` as absent. It overwrites the
record with a fresh one: options from the dismissed lifecycle are not carried over, and the
notification is posted again. Only the system notification id is kept. If a dismissal was recorded
while the notification was in fact still showing, for example from a stale delete broadcast, the new
post then replaces it in place, so no copy is left behind that `stop` and `endAll` can no longer
reach. A record that is not dismissed still produces `already_exists`.

`upsertAndroidOngoingNotification()` and `updateAndroidOngoingNotification()` keep rejecting a
dismissed record with `reason: 'dismissed'`. The line falls between two intents:

- `start` is the app saying "begin this now". Something like a new ride or a restarted workout is
  a deliberate decision, and it should not depend on whether the user swiped the last one away.
- `update` and `upsert` carry progress, very often from a server push. They must not bring back a
  notification the user dismissed. That is the existing contract, and it does not change.

The check reads the persisted `dismissed` flag, not the live status bar. Right after `notify()` the
status bar may not list the notification yet, so a check against it could let a second, rapid
`start` with the same id post a duplicate.

### `autoStart` runs when it is turned on, not whenever the hook is inactive

The hook's `autoStart` effect used to depend on whether the hook was inactive. Once dismissals clear
the hook's state, that dependency, together with the `start()` change above, would re-post a
notification the moment the user swipes it away. It also made `end()` restart the notification
immediately while `autoStart` was set. The effect now runs when the component mounts with `autoStart`
on, or when `autoStart` turns from off to on, and only if the notification is not already active at
that moment. This matches the iOS `useLiveActivity` hook and the documented meaning: "create the
notification when the component mounts".

So a notification the user dismissed stays dismissed while the component stays mounted. It comes
back on the next mount with `autoStart`, or when the app calls `start()`.

## Consequences

- `isActive` from the hook turns `false` when the user swipes the notification away, when it times
  out, and when any code in the app stops it.
- `start()`, from the hook or directly, posts again after a dismissal or timeout without calling
  `stop` first. Before this change it returned `already_exists`. This is a behavior change and it
  ships as a patch. Code that used `start` for routine updates, such as a push handler that falls
  back to `update` on `already_exists`, now brings a dismissed notification back. The docs point
  such code to `upsert`.
- With `autoStart`, a dismissed notification is posted again the next time the component mounts.
  Before, a remount hit `already_exists` and the notification stayed gone until something called
  `stop`.
- Remote updates and upserts still cannot resurrect a dismissed notification.
- `end()` with `autoStart` set no longer restarts the notification straight away.
- Android now has one native-to-JS event, `onOngoingNotificationEnded`, and it is internal. Later
  Android events can follow the same pattern: a codegen emitter on the spec, plus a listener set
  that the module registers in `initialize()`.
- The event names a notification id, not a lifecycle. If other code stops a notification and
  starts it again under the same id while the hook is mounted, the hook hears the stop, reports
  `isActive: false`, and does not learn about the new start. It recovers on its own `start()`,
  which gets `already_exists` for the live notification and adopts it. A matching "started" event
  would fix this, but it would also need to settle which caller owns the content, and that is out of
  scope here.
- A notification cancelled by other code through the platform API (for example another library's
  "dismiss all notifications") never reaches the delete intent. Voltra cannot observe that case. The
  hook keeps reporting `isActive: true` until its next call, and an update then posts the
  notification again, as it did before.
