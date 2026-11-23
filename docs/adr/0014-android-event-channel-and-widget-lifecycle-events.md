# ADR 0014: Android event channel and Dynamic Widget lifecycle events

Status: Accepted

Implements [#315](https://github.com/callstackincubator/voltra/issues/315), and the channel that
[#314](https://github.com/callstackincubator/voltra/issues/314) was meant to provide, with a different
transport.

## Introduction

An Android app that uses Dynamic Widgets could not find out when a user placed, removed, resized or
restored one of its widgets, or when the last placement of a widget type went away. The widget
receivers see every one of these callbacks, but used them only for native cleanup. Polling
`getActiveWidgets()` and diffing snapshots cannot tell "removed" from "never placed", and cannot run
while the app is dead, which is when most placements happen.

Android also had no native-to-JavaScript event path for public events. `addVoltraListener` returned
a no-op subscription for every event on Android. The only native-to-JavaScript event was the internal
`onOngoingNotificationEnded` emitter from ADR 0012, which is not queued.

This ADR records two things: the Android event channel, and the six lifecycle events that are its
first producer: `widgetAdded`, `widgetResized`, `widgetRemoved`, `widgetRestored`, `widgetEnabled`
and `widgetDisabled`.

## Context

- A widget callback runs in a `BroadcastReceiver`, usually while the app's JavaScript runtime is not
  running. Glance's receiver has already taken `goAsync()`, and the process can be reclaimed as soon
  as the callback returns.
- #314 specified a transport for the channel: JavaScript tells native when it has a listener, native
  delivers hot while that flag is set and persists otherwise, and drains the stored events when the
  listener count goes from 0 to 1. That is the design ADR 0011 rejected for iOS interactions: the
  flag is set by an asynchronous call, is shared by every React Native instance in the process, and
  "delivered" only means handed to the emitter.
- Android's widget callbacks carry no "added" callback. `onUpdate` and `onEnabled` are also re-sent
  for every existing placement at boot and after a package update, so neither means "new" on its own.
- A launcher can recycle an `appWidgetId` across widget types (the reason ADR 0006 keys instance
  configuration by widget type and id).

## Decision

### The Android channel copies ADR 0011's pull design

Native always records. It only signals that events are available, and JavaScript removes and
receives events in one synchronous call. Native keeps no "JavaScript is listening" state. #314's
listener-active flag, native drain and hot delivery are not used, for the reasons ADR 0011 gives
under "Rejected: deliver hot and persist only without a listener".

- **Bus.** `voltra.events.VoltraEventBus` is a process-wide object, newly written in the shape of the
  iOS bus. It is not a restore of the Kotlin bus deleted in `5965765`, which delivered hot with
  `sendBroadcast`. `send(context, event)` records the event and signals every subscriber, and never
  throws. `subscribe` returns a token and `unsubscribe(token)` removes only that token, so a React
  Native instance torn down after its replacement subscribed cannot remove the replacement.
  `pop(context, types)` removes and returns the queued events of those types, oldest first.
  `restore(context, events)` puts events back at the front, in order.
- **Queue.** `VoltraEventQueue` is a file, `voltra_event_queue_v1.json` in `noBackupFilesDir`,
  holding one JSON array whose order is the delivery order. Every write goes through `AtomicFile`,
  whose `finishWrite` syncs the file, under a process-wide lock, because a receiver's process can be
  reclaimed as soon as the callback returns. Widget receivers run in the app process, so a process
  lock is enough. Why the queue is not in SharedPreferences is under "The queue is left out of
  backup".
- **Native module.** `VoltraModule` subscribes to the bus in `initialize()` and forwards each signal as
  the internal `onEventsAvailable` emitter, whose payload is the constant `{ type: 'eventsAvailable' }`.
  It unsubscribes with its token in `invalidate()`. `popEvents(types: string[]): string` returns a
  JSON array. `restoreEvents(eventsJson: string): boolean` returns a value on purpose: with `void`,
  codegen makes the method asynchronous, and a pull right after a restore could miss the restored
  events. None of these are re-exported.
- **Dispatcher.** `packages/android-client/src/event-channel.ts` mirrors the iOS interactions
  dispatcher. Each subscriber is filtered by event type, and a pull takes only the types that have
  subscribers, so subscribing to `widgetRemoved` alone leaves queued `widgetAdded` events in place.
  It pulls when a subscriber is added, on every `onEventsAvailable` signal, and when `AppState`
  becomes `active`, always on a microtask, so `addVoltraListener` returns before any listener runs
  and calls in the same tick share one pull. It dispatches oldest first, and a pull requested during
  a dispatch runs after it. A listener that throws is logged and the others still run. Events whose
  listeners all unsubscribed during the dispatch are handed back with `restoreEvents`. The signal and
  `AppState` triggers are attached on the first subscriber and detached on the last.
- **Generic.** The queue, bus and dispatcher take any event type. #314 (widget `interaction`) and
  #316 (notification actions) add producers later without a new transport. Nothing else is built for
  them here, and there is no delivery-policy hook: a future headless-start design (#316, #185) adds
  its own.

**Delivery is at most once,** as in ADR 0011. An event is handed to JavaScript by the pull that
removes it and is never delivered again, including after a JavaScript reload or the next cold start.
If the JavaScript instance dies between the pull and its listeners running, those events are lost.
An event never starts the JavaScript runtime.

**Mixed versions.** A JavaScript bundle updated over the air onto a native build without
`popEvents`/`restoreEvents` warns and returns a no-op subscription. An older bundle on a new binary
never pulls; its events expire with the queue's retention.

### Producers set retention and coalescing; the queue applies them

The queue knows no event types. Each `VoltraEvent` states its own policy, so a new producer adds
events without editing the queue:

- **Retention.** `retentionMs` is required; there is no default for other types. The lifecycle
  producer keeps all six lifecycle events 7 days: they describe placements an app reconciles on its
  next launch, which may be days later.
- **Coalescing.** `coalescingKey` is optional. Recording an event with a key drops any queued event
  with the same key, so the newest sits at its own position. On restore, a restored event is dropped
  when an event with the same key is already queued, because the queued one is newer. The lifecycle
  producer keys `widgetResized` by type, `widgetType` and `appWidgetId`, so only the latest size of a
  placement is kept; the other five have no key.
- **Cap.** The queue holds at most 200 events across all types. The oldest are dropped with a
  warning. An app that never subscribes cannot grow the file without limit.
- Retention and the cap are applied on every record, pop and restore. An entry without a non-empty
  `type`, a numeric `timestamp` and a numeric retention is skipped and the rest are kept; a queue
  that does not parse at all is treated as empty.
- **The policy travels with the event.** The queue stores it on the entry under a reserved
  `__queue` key (`{ retentionMs, coalescingKey? }`), and `popEvents` returns it. The JavaScript
  dispatcher removes `__queue` before calling listeners and hands undelivered events back to
  `restoreEvents` untouched, so a restored event keeps the policy it was recorded with. Keeping the
  policy only in the queue entry was rejected: `pop` removes the entry, so `restore` would get events
  without a policy and would have to guess one. `__queue` is not in the public event types, and
  listeners never receive it.

**Envelope.** Every event carries `type`, `source` and `timestamp` (epoch milliseconds), plus its
type-specific fields at the top level. Array order is the delivery order.

### The queue is left out of backup

Queued events describe placements on the device that recorded them. After an Auto Backup restore or
a device-to-device transfer they would be delivered on a device where those placements never
existed, so the queue must not be backed up. The placement registry stays in backup; restored
entries are made safe by dropping unbound ones (below).

- **A library cannot exclude its own file through backup rules.** `android:fullBackupContent` and
  `android:dataExtractionRules` are single attributes on `<application>`, each naming one XML file,
  and the manifest merger does not combine two rule files. A library that sets them takes over the
  backup policy of an app that has none, and causes a merge conflict in an app that has its own,
  which the app resolves with `tools:replace` and so drops the library's rules. Excluding the queue
  on every API level would also need both attributes: `fullBackupContent` up to Android 11, and
  `dataExtractionRules` with the exclusion in both `<cloud-backup>` and `<device-transfer>` from
  Android 12, where `fullBackupContent` no longer covers device transfer. A custom `BackupAgent` is
  one attribute too. `expo-secure-store` shows the same limit: it adds its exclusions with a config
  plugin, and asks apps with their own rules to add them by hand.
- **`noBackupFilesDir` is never backed up,** on every API level, for cloud backup and device
  transfer, whatever rules or `allowBackup` value the app declares. SharedPreferences cannot be
  placed there, so the queue is a plain file. The cache directory was rejected because the system
  can clear it and silently lose events; device-protected storage was rejected because it has its
  own backup domains.
- **Migration.** On its first access the queue moves the events from the old
  `voltra_event_queue_v1` SharedPreferences to the front of the file, then deletes the preferences.
  The preferences are only deleted once the file write succeeds. A backup taken by an older version
  can still bring the old preferences back; their events are then migrated, and retention bounds how
  long they can live.
- Host apps need no change.
- Sources: [Auto Backup](https://developer.android.com/identity/data/autobackup),
  [Android 12 backup changes](https://developer.android.com/about/versions/12/behavior-changes-12#backup-restore),
  [manifest merging](https://developer.android.com/build/manage-manifests),
  [`getNoBackupFilesDir`](<https://developer.android.com/reference/android/content/Context#getNoBackupFilesDir()>),
  [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/securestore/).

### A placement registry decides what is new

`DynamicWidgetPlacementRegistry` is a SharedPreferences file owned by the Dynamic Widget package,
`voltra_dynamic_widget_placements_v1`. It holds the last recorded size of each placement, keyed
`<widgetType>:<appWidgetId>` because ids can be recycled across widget types. It does not import the
payload widget package (ADR 0000), and payload-driven widgets emit nothing.

- **Seeding.** The registry seeds itself inside whichever of its methods runs first, so no caller
  seeds it explicitly, and a persisted `__seeded` flag marks it done. What it seeds depends on the
  package's install times:
  - **Upgrade** (`firstInstallTime` differs from `lastUpdateTime`, so the app has been updated at
    least once): it records every current placement of every installed Dynamic receiver with its
    current size, and emits nothing, so placements made before the upgrade to this version are not
    reported as new.
  - **Fresh install** (the two times are equal): it starts empty. A widget placed from the launcher
    before the app is first opened is then reported as `widgetEnabled` and `widgetAdded`, instead of
    being absorbed by a seed that already sees its id.
  - If the package info cannot be read, it seeds as for an upgrade and logs a warning.
  - **Cleared app data** changes neither time. On an app that was updated at least once it seeds
    silently. On an app that was never updated it looks like a fresh install: placements already on
    the home screen are reported as `widgetAdded`, and `widgetEnabled` fires too. Nothing survives a
    data clear, so this cannot be told apart; apps that reconcile with `getActiveWidgets()` end up
    correct anyway.
- **`widgetEnabled` is gated** on the registry holding no placement of that widget type. The system
  re-sends `onEnabled` at boot and after a package update for a type that already has placements;
  those placements are in the registry, so nothing is emitted. The re-sent `onUpdate` calls find
  every id known and emit nothing either.
- **Unbound entries are dropped, bound ones are never added.** The registry file is in Auto Backup,
  so after a restore onto a new device whose launcher did not restore the widgets, it holds the old
  device's ids: they would suppress `widgetEnabled` and swallow `widgetAdded` for a new placement
  that reuses one of them. So the registry drops every entry whose `appWidgetId` is not in
  `AppWidgetManager.getAppWidgetIds` for its widget type's receiver, silently (no `widgetRemoved`
  for placements that only existed on another device):
  - **On app start**, from `VoltraModule.initialize()` through `DynamicWidgetPlacementData.onAppStarted`,
    which logs a failure and never throws.
  - **In `onEnabled`, before the `widgetEnabled` gate**, so a type whose only entries are stale is
    reported as enabled by the same callback that meets them. A failure there is logged and the gate
    runs on the registry as it is.
  - **Seeding** records exactly the bound placements, and a restored registry is already seeded, so
    a seed has nothing to drop.
  - Only installed Dynamic widget types are pruned; entries of a type whose receiver is gone are
    left alone. A bound id that is not recorded is never added here: that would swallow a
    `widgetAdded` whose `onUpdate` is still on its way. It is left for the normal update path.
  - **Dropped entries are retired, not deleted.** During a launcher restore the old ids are by
    definition no longer bound, and an app start or `onEnabled` can run between the data restore and
    the launcher's `onRestored`. A retired entry (`__retired:<widgetType>:<appWidgetId>`) no longer
    counts as a known placement, but the restore move still finds it, so every old id the registry
    knew is still reported as `widgetRestored`. Retired entries are bounded by the old device's
    placements and are dropped when a restore moves them. Pruning in `onPlacementsSeen` or
    `onRestored` was rejected: it would not help a reused id, which is bound, and in `onRestored` it
    would run exactly between the restore and its remap.
  - **Limit.** A new placement that reuses an old id before the app starts is bound when `onEnabled`
    prunes, so it is still taken as known: its `widgetAdded` is lost, and so is `widgetEnabled`.
    Apps that reconcile with `getActiveWidgets()` cover it.
- **The registry is one per-placement store.** `DynamicWidgetPlacementData` removes and moves its
  entries next to the instance configuration and the last good render, each in its own guard. Its
  `onRestored` returns the pairs the registry moved, and the receiver reports those. The stores know
  nothing about events.
- **Removal forgets the ids.** `onDeleted` removes the deleted ids from the registry before emitting,
  and `onDisabled` clears every entry of the widget type. If the launcher later reuses an id for the
  same widget type, that placement is reported as `widgetAdded` again.
- **Restore moves all pairs in one write.** `onRestored` moves every (old, new) pair whose old id is
  known or retired in a single SharedPreferences commit. Moving pairs one by one would let a chain such as
  1 → 2, 2 → 3 overwrite entry 2 before it moved.
- An entry whose stored size cannot be decoded still counts as a known placement, so it cannot
  produce a second `widgetAdded`.

### The lifecycle rules

`DynamicWidgetLifecycleEvents` holds the rules. They run from `VoltraClientWidgetReceiver`, the
Dynamic base receiver, so `VoltraServerDrivenClientWidgetReceiver` inherits them. All six use
`source: "widget"`.

| Event            | Native trigger                                                         | Emitted when                                                                                                               |
| ---------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `widgetAdded`    | `onUpdate` or `onAppWidgetOptionsChanged`, whichever sees the id first | the id is absent from the registry for this widget type; it is then recorded with its size                                 |
| `widgetResized`  | `onAppWidgetOptionsChanged`                                            | the id is known, the options carry a size key, and the size differs from the recorded one; the registry is updated         |
| `widgetRemoved`  | `onDeleted`                                                            | always, one per id in array order, even for an id the registry didn't know                                                 |
| `widgetRestored` | `onRestored`                                                           | per (old, new) pair whose old id is known or retired; the entry moves to the new id. Mismatched array lengths emit nothing |
| `widgetEnabled`  | `onEnabled`                                                            | the registry holds no placement of this widget type once unbound entries are dropped                                       |
| `widgetDisabled` | `onDisabled`                                                           | always; clears the registry for this widget type                                                                           |

- An old id unknown at restore is left alone. The `onUpdate` that follows the restore reports the new
  id as `widgetAdded`.
- A size is computed by `WidgetPlacementSize.fromOptions`, which `getActiveWidgets()` also uses, so a
  placement looks the same whether it was read or received. "Resized" means `width` or `height`
  differ, or the `sizes` sets differ ignoring order.
- **Order inside a callback:** the base receiver's own cleanup runs first (clearing or remapping
  per-instance configuration), then the registry update, then emission. A listener for
  `widgetRemoved` that reads the placement's configuration finds it gone.
- Every rule logs failures and never throws, and the existing cleanup always runs. There is no
  `goAsync()`.

### Deviations from #314 and #315

- **#314's transport is not used.** See the first section.
- **#315 requirement 5, order against the schedule recompute.** Requirement 5 asks for `widgetRemoved`
  after the server-driven schedule recompute. The recompute runs in
  `VoltraServerDrivenClientWidgetReceiver.onDeleted` after its call to `super.onDeleted`, and the
  event is emitted inside that `super` call, so the event is recorded first. Reordering would need an
  emission hook that runs after subclass cleanup. JavaScript has no API that can observe the
  schedule, so the order cannot be seen, and the docs make no ordering claim about fetch work.
- **#315 requirement 13, ordering across types, is narrowed to listeners that subscribe in the same
  tick.** Ordering across event types holds among events pulled together. A listener for one type
  that subscribes later can receive its events after events of another type that happened later,
  because the earlier pull already took those. The docs recommend subscribing to every lifecycle
  event the app needs in one place at the root of the app.
- **Seeding caveat.** After an upgrade, a placement made between the upgrade to this version and the
  registry's first use (the next Dynamic Widget callback) is absorbed by the seed and never reported.
  #315 accepts this; the docs say so and tell apps to reconcile with `getActiveWidgets()`. A fresh
  install has no such gap, because it starts empty.
- **The placement types live in `@use-voltra/android`.** The spec put `VoltraWidgetPlacement`,
  `VoltraWidgetPlacementSize` and `VoltraWidgetPlacementWithSize` in `@use-voltra/android-client`,
  re-exported by `@use-voltra/android`. `@use-voltra/android-client` depends on
  `@use-voltra/android`, so that direction would be circular. They are defined in
  `packages/android/src/widgets/types.ts` next to `WidgetInfo`, which is built from them, and
  `@use-voltra/android-client` re-exports them with its event types.

## Consequences

- `addVoltraListener` delivers the six lifecycle events on Android. On other platforms subscribing to
  any of them warns on every call that it is Android-only and returns a no-op subscription. The
  iOS-only events keep their per-call "only supported on iOS" warning on Android.
- `timestamp` is epoch milliseconds on Android. iOS events carry seconds. Neither platform changes.
- `getActiveWidgets()` gains `sizes`, and the placement types are shared by `WidgetInfo` and the
  events.
- The queue is a hint. Events can be lost at most-once boundaries, after 7 days, past the cap, or to
  the seeding caveat. Queued events do not follow a backup or a device transfer. The docs tell apps to reconcile with `getActiveWidgets()` at startup and treat
  `getActiveWidgets()` as the source of truth.
- Android now has two native-to-JavaScript paths: the internal, unqueued `onOngoingNotificationEnded`
  for state (ADR 0012), and this queued channel for events. New public Android events go through the
  channel.
- After a device restore, a widget type whose placements the launcher restores can report
  `widgetEnabled` before its `widgetRestored` events, if the system sends `onEnabled` after the old
  ids stopped being bound: the type has no bound placement Voltra knows yet.
- Launcher re-creation (switching launchers, or clearing launcher data) arrives as `widgetRemoved`
  for the old ids, `widgetDisabled` if none remain, then `widgetEnabled` and `widgetAdded` for the new
  ids. Per-instance configuration does not follow, as before (ADR 0006).
