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
events, interactions through a queue that is drained only while someone is listening.

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
4. **Taps can replay into nothing.** Module creation happens on the first `getNativeVoltra()` call,
   and `addVoltraListener('interaction')` makes that call before it attaches its listener. The
   replay can run, and clear the queue, before anyone listens.

The website also claims Voltra "handles event queuing automatically when using App Groups", which is
true only for interactions.

`dynamicLiveActivityRenderFailed` already works the way interactions should: `events.ts` counts its
JavaScript listeners and calls `setDynamicLiveActivityRenderFailureListenerActive`, and native code
drains its queue only while that count is above zero.

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
  value differs from the last one seen, starting from the value read when monitoring began. Neither
  depends on the push flag: an app without push still wants to hide its "start tracking" button.

The usage pattern this supports, and which the docs show, is **subscribe first, then call the
getter**. A change that lands between the two is then seen at least once. The same token can arrive
twice — once from the getter, once from the event — so the backend upserts by `activityName` (or by
device for the push-to-start token) rather than appending.

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

### Interactions are events: hold them until JavaScript listens, then drain

`addVoltraListener('interaction')` counts its subscriptions exactly as
`dynamicLiveActivityRenderFailed` does and calls a new internal spec method,
`setInteractionListenerActive(active)`, on the transitions 0→1 and 1→0. No public API changes.

`VoltraEventBus` applies four rules:

1. **Listener active**: deliver the interaction hot and do **not** persist it.
2. **No listener** (including any process without the app's event handler): persist it only.
3. **Count goes 0→1**: read and clear the queue, then deliver every entry. The queue is also drained
   when the app returns to the foreground while a listener is active, which picks up entries written
   by another process or during a reload.
4. **Module creation does not replay.** `subscribe()` installs the handler and nothing else.

An entry leaves the queue only in the same synchronous step that hands it to the emitter, and only
while a listener is attached. That fixes both the duplicate replay (rule 1) and the replay into
nothing (rules 3 and 4). If the process dies between clearing the queue and the emit, those entries
are lost; delivering them twice was judged worse than that window.

Without an App Group, persistence fails as it does today: a tap with no listener is logged and
dropped. Hot delivery does not need the App Group.

### Known edge cases

- **`VoltraView` counts as a listener.** A mounted `VoltraView` with `onInteraction` subscribes to
  `interaction` and filters by `source`. While it is the only listener, the queue drains into it and
  events meant for a Live Activity or widget are discarded by its filter. This is the same as today's
  hot path. Apps that care register one app-level `interaction` listener at the root, which the docs
  already recommend.
- **Direct emitter subscribers are not counted.** Code that subscribes through
  `getNativeVoltra().onInteraction` instead of `addVoltraListener` does not activate delivery and
  receives only what an `addVoltraListener` subscription causes to be delivered.
- **Listener state does not survive a reload.** Module invalidation resets the active flag, and the
  new JavaScript instance re-registers it when its listener mounts. Taps in between are persisted.

### Android is out of scope

Android sends no native-to-JavaScript events, Voltra owns no push tokens there (remote ongoing
notification updates arrive through the app's own push delivery), and whether ongoing notifications can be posted
or promoted is already exposed through `getAndroidOngoingNotificationCapabilities()`. Nothing in this
ADR has an Android counterpart to add.

## Consequences

- An app can read its tokens and the enablement state at any time, including after sign-in or a
  reload, without starting a new activity.
- Backends must treat token reports as idempotent upserts. The docs say so.
- A tap the app handled is never delivered again, and a tap that launched the app is delivered once,
  to the first listener that attaches.
- The spec gains four methods and one emitter; `setInteractionListenerActive` is internal and not
  re-exported.
- The website no longer claims that every event is queued. It says which data is a value to read and
  which is an event that waits for a listener.
