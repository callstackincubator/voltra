# ADR 0013: Ongoing notification foreground service and push envelope

Status: Accepted

Implements [#323](https://github.com/callstackincubator/voltra/issues/323).

## Introduction

Android ongoing notifications are Voltra's counterpart of iOS Live Activities, but their delivery
stops at `NotificationManager.notify()`. Three problems follow from that:

1. Nothing keeps the app process alive. A few minutes after the user leaves the app the system may
   kill it, and the notification stays in the shade frozen at its last value.
2. On Android 14 and later the user can swipe any `setOngoing(true)` notification away. Neither the
   capabilities API nor the docs said so.
3. Every app wrote the same push task body: find the message, parse it, call upsert or stop. The
   message had no version, and two pushes delivered out of order left the older state on screen.

An app that already ran its own foreground service also could not adopt Voltra's notification,
because neither the system notification id nor the built `Notification` reached it.

## Decision

### One Voltra-owned foreground service, opt-in per notification

Voltra ships `voltra.ongoingnotification.VoltraOngoingNotificationService`. The config plugin (and
`voltra apply`) declares it only when `ongoingNotificationForegroundService.types` is set, together
with `FOREGROUND_SERVICE` and the `FOREGROUND_SERVICE_<TYPE>` permissions. The app picks the types,
because it is the app that has to justify each type in Play Console. Voltra does not add runtime
prerequisites such as location permissions, and rejects `camera`, `microphone`, `mediaProjection`,
`phoneCall`, `mediaProcessing` and `systemExempted`, which need setup Voltra cannot provide.

Removing the key, or dropping a type, removes or narrows the service but never removes a permission.
A library merged in at build time may declare a service that needs the same permission, and the
CLI cannot see it, so a permission Voltra once added cannot be told apart from one the app needs.

`start` and `upsert` take `foregroundService: { type, onDismiss?, fallbackBehavior? }`:

- The notification is posted with `notify()` first and its record saved, and then the service is
  started with `ACTION_ATTACH`. The manager hands the service the `Notification` it just posted
  through an in-process registry, so the service calls `startForeground` with the record's system
  id at once, without decoding the payload's images again on the main thread. It rebuilds from the
  stored payload only if that hand-over is missing. The manager waits up to 5 s for the outcome; on
  a timeout it also queues a stop, so a late attach cannot outlive the result the caller got.
- Problems Voltra can see beforehand are reported without starting the service: `not_declared`,
  `unsupported_api` (a type newer than the running API), `type_not_declared`, `busy`, and on API 34+
  `missing_permission` when none of the runtime permissions the type requires is granted (location,
  health and connected-device permissions) and `background_start_not_allowed` for `location` from
  the background without background location access.
- These checks matter beyond a clear error: a service started with `startForegroundService` that
  stops before calling `startForeground` crashes the app on Android 9+. The service therefore never
  stops while it owes that call. When its notification is already gone (stopped while the service
  was starting) it goes foreground with a bare placeholder, removes it and stops. A `startForeground`
  that throws anyway can no longer be satisfied; the checks above exist to make that unreachable for
  the documented causes.
- Start failures are mapped from the exception class name (the classes exist only from API 31 and
  34): `background_start_not_allowed`, `timeout_exhausted`, `missing_permission`,
  `type_not_declared`.
- After `startForeground` the service checks that the record still exists. If the manager gave up,
  or the app stopped the notification meanwhile, the service releases it instead of holding a
  notification `stop` and `endAll` could no longer reach.
- With the default `fallbackBehavior: 'standard'` the notification stays posted and the result says
  why the service did not attach. With `'error'`, a failure known beforehand rejects with
  `VOLTRA_FOREGROUND_SERVICE_UNAVAILABLE` before anything is posted, so the user never sees or hears
  a notification that is taken down again. A failure while attaching cancels the notification,
  removes the record, keeps its revision as a tombstone, and rejects.
- `update` never touches the service. It reposts under the same id, which the service keeps. An
  `upsert` with `foregroundService` that lands on a running notification attaches the service if
  that notification is not backed by it yet: in a push flow the first push may be refused from the
  background, and a later high-priority push must still be able to attach.
- Every stop command finishes with `stopSelfResult(startId)`, so a stop that races a newer attach
  (a dismissal followed by an immediate restart) does not tear the service down under it.
- `stop` and `endAll` stop the service with `STOP_FOREGROUND_REMOVE` and wait for `onDestroy`
  before `cancel()`, because `cancel()` is ignored for a foreground service notification.
- A dismissal on API 34+ stops the service with `STOP_FOREGROUND_DETACH` by default (`onDismiss:
'stop'`), or leaves it running (`'keep'`). Nothing is reposted.
- `onTimeout` (API 34 `shortService`, API 35 `dataSync`) detaches the service and records
  `timed_out`; the notification stays.

One service holds one foreground notification. Supporting several would need one generated service
class per notification, so a second request reports `busy`.

The service returns `START_NOT_STICKY`. After process death there is no JavaScript to drive the
notification, so the system must not recreate the service. The service runs in the app process,
so an in-process registry is enough to know which notification is attached. A fresh process finds
the registry empty and rewrites any record still marked `attached` to `detached`.

The service calls `Service.startForeground(id, notification, type)` directly behind an API 29 check,
and the two-argument form below. `ServiceCompat.startForeground` would need androidx.core 1.12, and
the library pins 1.9.0 to match `work-runtime-ktx`.

### Rejected: making notifications non-dismissible again

On API 34 only call, media and device-policy notifications stay non-dismissible, and a foreground
service does not change that. Reposting after a swipe, or dressing the notification up as
`CallStyle` or `MediaStyle`, would fight the platform and the Live Updates guidance ("Don't repost
Live Updates that the user dismissed"). Voltra reports `isUserDismissible` instead.

### Handle for apps with their own service

`getAndroidOngoingNotificationHandle(id)` returns the system notification id, and
`VoltraOngoingNotifications.buildNotification(context, id)` rebuilds the notification in Kotlin, so
an app's own service can call `startForeground` with it. Voltra's `stop` then removes only the
record; the app's own `stopForeground(STOP_FOREGROUND_REMOVE)` removes the notification.

### Push envelope version 1 and a native revision check

The push message gets a version (`v`, absent means 1) and an optional `revision`.
`parseAndroidOngoingNotificationPush` is pure and lives in `@use-voltra/android`, so the server's
`createAndroidOngoingNotificationPushEnvelope` and the client's `handleAndroidOngoingNotificationPush`
share one schema. The handler never throws, so a malformed push cannot crash the task.

The revision check is native, not in JavaScript: each record stores the highest revision applied,
and start, update, upsert and stop with a revision that is not higher return `stale_revision`. A
stop removes the record, so its last revision is kept as a tombstone (newest 100); otherwise an
older upsert arriving after a newer stop would bring the notification back. Storing it natively
makes the check survive the process restarts between pushes.

Voltra still does not register with FCM, read push tokens, or create channels. The handler takes an
`ensureChannel` callback for the last of these.

## Consequences

- Apps can keep the process alive for one ongoing notification at a time, at the cost of a Play
  Console declaration for every type they use.
- Records gain `lastRevision` and three foreground service fields. All are optional with defaults,
  so records written by older releases still decode.
- The last posted payload is stored under its own key per notification, so the handle's builder and
  the service can rebuild a notification. It is kept out of the shared records entry because
  payloads can carry inline images and every post would otherwise rewrite all of them.
- The hook's options take no `revision`: they are replayed by every update, so a stored revision
  would make all but the first update stale.
- The manager's records lock moves from the instance to the class, so the dismissed receiver and
  the service no longer race the manager when they write records.
- `stopAndroidOngoingNotification` takes an optional `{ revision }`.
- The events for dismissal and foreground service state changes are left to the ongoing-notification
  events issue; this ADR only persists the state they would report.
