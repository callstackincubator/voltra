# ADR 0011: Live Activity push state getters and interaction drain

Status: Accepted

Implemented by [#353](https://github.com/callstackincubator/voltra/pull/353).

## Introduction

An iOS app that drives Live Activities from a server needs three things from the device: the push
token of each running activity, the push-to-start token, and whether the user allows Live Activities
at all. Voltra delivers the first two only as events, and the third not at all. An app that
subscribes a moment too late never learns its tokens, and has to start a new activity to get one.

The same native event path also carries button and toggle taps (`interaction` events). Those are
queued in the App Group so a tap that launches the app is not lost, but the queue is cleared at the
wrong time: a tap the app already handled is delivered again on the next launch or Metro reload, and
a tap that launches the app can be replayed before any JavaScript listener exists.

This ADR records how each kind of native data reaches JavaScript: state through getters plus change
events, interactions through a native queue that JavaScript pulls from when it is ready.

## Context

Native code starts monitoring when the TurboModule is created (`NativeVoltra.mm`,
`setEventEmitterCallback`). `VoltraEventBus` then routes every native event one of two ways:

- **Transient** — `stateChange`, `activityTokenReceived`, `activityPushToStartTokenReceived`. Posted
  to `NotificationCenter` and emitted through a codegen `EventEmitter`. If no JavaScript listener
  is attached at that moment, the event is gone.
- **Persistent** — `interaction`. Written to the App Group queue (`Voltra_EventsQueue`) _and_ posted
  for hot delivery. The queue is read and cleared once, in `subscribe()`, at module creation.

That produces four defects:

1. **Tokens are emitted once, at module start.** ActivityKit hands the current per-activity token
   (`activity.pushTokenUpdates`) and push-to-start token (`Activity.pushToStartToken`, then
   `pushToStartTokenUpdates`) to the observers as soon as monitoring begins. A listener added later,
   for example after the user signs in, never sees them. Dynamic Live Activities have their own
   observer with the same behavior.
2. **Enablement is invisible.** `ActivityAuthorizationInfo().areActivitiesEnabled` is read natively
   before every start, but JavaScript can only find out by trying to start an activity and catching
   the rejection.
3. **Handled taps replay.** `send()` always persists an interaction, even when it is delivered hot.
   The queue is only cleared at the next module creation, so every tap the app handled while running
   is delivered a second time on the next cold launch or reload.
4. **Taps can replay into nothing.** The module is created by the first `getNativeVoltra()` call,
   and the replay runs at that moment. When any other Voltra call — `isHeadless()`, a widget
   update, another event's listener — creates the module before the app's `interaction` listener
   exists, the queue is read, emitted to no one, and cleared.

The website also claims Voltra "handles event queuing automatically when using App Groups", which is
true only for interactions.

`dynamicLiveActivityRenderFailed` already keeps its own App Group queue with a cross-process file
lock, and native code drains it only while JavaScript reports a listener. That diagnostic path keeps
its push model and is out of scope here, apart from being made safe for several React Native
instances (below).

## Decision

### Tokens and enablement are state: a getter for the current value, an event for changes

```ts
export type LiveActivityPushToken = {
  /** Same value as `activityName` on `activityTokenReceived`. Covers static and dynamic activities. */
  activityName: string
  pushToken: string
}
/** Tokens of running activities that already have one. Empty when push notifications are disabled. */
export function getLiveActivityPushTokens(): Promise<LiveActivityPushToken[]>
/** iOS 17.2+. null on older iOS, when push is disabled, or before APNs issues one. */
export function getLiveActivityPushToStartToken(): Promise<string | null>
/** Synchronous, like isLiveActivityActive. False below iOS 16.4. */
export function areLiveActivitiesEnabled(): boolean
```

and a new event, `activityEnablementChanged`, carrying `{ enabled: boolean }`.

The getters read ActivityKit directly at call time:

- `getLiveActivityPushTokens` walks `Activity<VoltraAttributes>.activities` and every registered
  Dynamic Live Activity attributes type, and returns each activity whose `pushToken` is set and
  whose state is neither ended nor dismissed. Activities started on a broadcast channel have no
  token and are not listed.
- `getLiveActivityPushToStartToken` reads `Activity<VoltraAttributes>.pushToStartToken`, the same
  token `activityPushToStartTokenReceived` carries. Dynamic Live Activity attributes types have
  push-to-start tokens of their own; neither the event nor the getter exposes them today.
- Both return empty results when `enablePushNotifications` is off (Info.plist
  `Voltra_EnablePushNotifications`), because activities are then requested without a push type and
  any token ActivityKit holds is not one the app asked for.
- `areLiveActivitiesEnabled` returns `ActivityAuthorizationInfo().areActivitiesEnabled`.
  `activityEnablementChanged` is driven by `activityEnablementUpdates` and is emitted only when the
  value differs from the last one seen, starting from the value read when monitoring began (the
  stream is created before that read, so a change in between is not missed). The event is app-wide
  and carries `timestamp` and `enabled`, but no `source`. Neither
  depends on the push flag: an app without push still wants to hide its "start tracking" button.
  Monitoring, and with it the enablement stream, starts regardless of the flag; only the token
  callbacks are gated. Below iOS 16.4 (the pods' deployment target) the getter returns `false`.
- The getters report what ActivityKit holds. On the simulator, `pushToStartToken` kept returning the
  previous token while Live Activities were disabled, and a new one was issued when they were
  re-enabled; the event reported the new one. Backends should treat the latest report as current.

The usage pattern this supports, and which the docs show, is **subscribe first, then call the
getter**. A change that lands between the two is then seen at least once. The same token can arrive
twice — once from the getter, once from the event — so the backend upserts by device and
`activityName` (or by device for the push-to-start token) rather than appending. Starting an
activity ends any running one with the same name, so a name identifies one running activity per
device; activities started remotely with a reused name are the app's responsibility.

### Rejected: replay the last value when a listener subscribes

A "sticky" event — resend the last token whenever JavaScript subscribes — would keep the event-only
API. It does not work on top of codegen `EventEmitter`s:

- **Native cannot see subscriptions.** A codegen emitter is a JavaScript-side fan-out; native code
  emits into it and is never told that a listener was added or removed. Replaying on subscribe would
  need a counting wrapper in JavaScript plus a native "resend now" call for every token event.
- **A resend reaches every listener.** The emitter has no per-listener delivery, so resending for
  the second subscriber re-delivers to the first, which then has to deduplicate.
- **A replayed value hides its freshness.** A token resent from memory looks exactly like a newly
  issued one, even if its activity has since ended. A getter reads ActivityKit at call time and
  can only return what is current.

### Rejected: queue tokens like interactions

A persisted token is a value that was correct when it was written. After a relaunch the activity may
have ended or the token rotated, and replaying it would send a dead token to the backend.
ActivityKit always knows the current value, so there is nothing to persist. Token and state-change
events stay transient.

### Interactions are events: always queued natively, pulled by JavaScript

Every tap is recorded in one bounded FIFO, in whichever process runs `VoltraInteractionIntent`,
whether or not anything listens. Native code never pushes tap data to JavaScript and keeps no notion
of "a listener is attached". Instead:

1. **Record.** `VoltraEventBus.send(.interaction)` appends a `VoltraInteraction` (with a new `id`)
   to `interactions-v1.json` in the App Group container, under an exclusive `flock` on a sibling
   lock file — the same transaction model as the render-failure queue — and writes it atomically
   with `completeUntilFirstUserAuthentication` protection, so an intent running on a locked device
   after first unlock can still record. It then posts a Darwin notification, scoped to the App Group
   so it reaches only this app and its extensions.
2. **Signal.** Each module turns that notification into `onInteractionsAvailable`, an internal
   emitter with no tap data.
3. **Pull.** `popInteractions(sources)` is a synchronous TurboModule method: it removes the
   entries and returns them in the same call, so an entry is either still in the queue or already in
   JavaScript's hands. It runs on the JavaScript thread, so it never waits on another process's lock
   for more than 250 ms; on timeout it returns nothing and the entries stay queued for the next pull.
4. **Dispatch.** `interactions.ts` owns the subscriber list. It pulls when a subscriber is added, on
   the availability signal, and when `AppState` becomes `active` — always on a microtask, so
   `addVoltraListener` returns before any listener runs, and calls in the same tick share one pull.
   It dispatches oldest first; a pull requested during a dispatch runs after it, so order holds. A
   listener that throws is logged and does not stop the others. Taps whose listeners all went away
   during the dispatch are handed back with the synchronous `restoreInteractions`, which puts them at
   the front of the queue unless an entry with the same `id` is already there.
   Every listener that subscribes before that microtask runs — for example, all `useEffect`
   subscriptions of one React commit — receives the same pulled taps. A listener that subscribes in
   a later commit does not: those taps are already out of the queue. The docs therefore recommend
   one app-level `interaction` listener, mounted at the root, that fans taps out within the app.
5. **No replay at module creation.** Subscribing to the bus installs the handler and the signal
   observers; it reads nothing from the queue.

`addVoltraListener('interaction')` keeps its signature. Its subscriber is unfiltered and takes every
tap. `VoltraView` uses an internal subscriber filtered by its `source`, kept across re-renders; when
only filtered subscribers exist, `popInteractions` takes only their sources and leaves every other
tap queued. A mounted `VoltraView` therefore never consumes taps meant for a Live Activity or
widget. Its own taps go through the same queue, so if the `VoltraView` unmounts before they are
pulled, the next unfiltered listener receives them, until they expire.

**Delivery semantics: at most once.** A tap is handed to JavaScript once, by the pull that removes
it, and is never delivered twice. If the JavaScript instance dies after a pull returns and before
its listeners run (a fatal error, or the process being killed mid-dispatch), those taps are lost.
Closing that window would need an acknowledgement — a lease that returns the entry to the queue
unless JavaScript confirms it — and redelivery after a crash would reintroduce duplicates, the
defect this ADR fixes, for a window of milliseconds.

Taps no longer depend on JavaScript running at the moment they are recorded. A tap made while the
app is suspended with a listener mounted is queued, and is taken when JavaScript next pulls — on the
signal if the process is awake, otherwise when the app becomes active. This was the case the
earlier "deliver hot, don't persist" design lost.

**Bounds.** Entries older than 15 minutes are dropped, and the queue keeps the newest 100. A tap
nobody took within 15 minutes is no longer something to act on, and an app that never registers an
interaction listener does not grow the file without limit. Both bounds are applied on every record,
pull and restore.

**Failures.** A queue file that cannot be read (for example, protected data while the device is
locked) aborts the transaction and is left untouched. A file that reads but does not decode is moved
to a single `interactions-v1.json.corrupt` and treated as empty. If recording to the App Group fails,
the tap is kept in the recording process's memory instead and still signalled, so a listener in that
process receives it; a tap recorded that way in an extension process is lost when the extension
exits.

**Upgrade.** Earlier releases kept the queue in UserDefaults under `Voltra_EventsQueue`, including
taps the app had already handled. Migrating it would deliver those once more, so the first
subscription after the upgrade deletes the key instead. Any tap queued but not yet consumed at the
moment of the upgrade is lost with it.

**Without an App Group** the queue lives in the app's memory. It still serves taps the system runs in
the app process — a `VoltraView`, or a Live Activity intent while the app is alive — but taps handled
by another process, such as a widget extension, never reach the app, and nothing survives a
relaunch. That matches what worked without `groupIdentifier` before.

**Mixed versions.** A JavaScript bundle updated over the air can run on a binary without
`popInteractions`. `subscribeToInteractions` detects that and subscribes to the legacy
`onInteraction` emitter instead, deriving an `id` from the tap's timestamp, source and identifier.
The new getters and `addVoltraListener('activityEnablementChanged')` warn and return empty values on
such a binary instead of throwing. The reverse — an old bundle on a new binary — receives no taps at
all: it listens on `onInteraction`, which the new binary never emits, and never pulls. That lasts
until the bundle is updated, which is the usual state right after a store release ships both.

### Rejected: deliver hot and persist only without a listener

The first version of this ADR kept native push delivery: deliver hot without persisting while
JavaScript reported a listener, persist otherwise, drain on the listener count going from 0 to 1. A
review found that it moved the problem rather than removing it:

- "Delivered" meant handed to the emitter, not received by JavaScript. The emitter hops to the
  JavaScript thread asynchronously, so a tap delivered while the app was suspended, or while the
  last listener was unmounting, was neither persisted nor received.
- The listener flag was set by an asynchronous `void` TurboModule call and lived in a per-process
  singleton shared by every React Native instance, so reloads and multiple instances could clear
  each other's state.
- Drained and hot taps could reach JavaScript out of order, and a source-filtered `VoltraView`
  counted as a listener and drained taps it then discarded.

Making JavaScript the side that removes entries, in a synchronous call, removes these: native holds
no listener state, and the only step that drops an entry is the one that returns it.

### Several React Native instances

`VoltraEventBus` is one per process. Each module subscribes with its own token and receives every
transient event and availability signal; `unsubscribe` removes only that token, so an instance torn
down after its replacement subscribed (a reload) cannot remove the replacement's handler. The
render-failure "listener active" state is kept per token for the same reason. Every instance pulls
from the same interaction queue, so a tap goes to whichever instance pulls first.

### Other edge cases

- **Direct emitter subscribers.** `getNativeVoltra().onInteraction` no longer fires on current
  builds. Code that subscribed to it directly must use `addVoltraListener('interaction')`.

### Android is out of scope

Android sends no native-to-JavaScript events, Voltra owns no push tokens there (remote ongoing
notification updates arrive through the app's own push delivery), and whether ongoing notifications
can be posted or promoted is already exposed through
`getAndroidOngoingNotificationCapabilities()`. Nothing in this ADR has an Android counterpart to add.

## Consequences

- An app can read its tokens and the enablement state at any time, including after sign-in or a
  reload, without starting a new activity.
- Backends must treat token reports as idempotent upserts. The docs say so.
- A tap the app handled is never delivered again. A tap that launched the app, or happened while the
  app was suspended, is delivered once when JavaScript next pulls, if that is within 15 minutes and
  the process survives the dispatch.
- Interaction events gain an `id`.
- The spec gains five methods and two emitters. `popInteractions`, `restoreInteractions` and
  `onInteractionsAvailable` are internal and not re-exported; `onInteraction` stays in the spec
  only for older native builds.
- The website no longer claims that every event is queued. It says which data is a value to read and
  which is an event that waits for a listener.
