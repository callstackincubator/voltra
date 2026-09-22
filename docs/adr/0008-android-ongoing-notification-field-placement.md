# ADR 0008: Where Android ongoing notification fields live

Status: Accepted

Implemented by [#327](https://github.com/callstackincubator/voltra/pull/327).

Resolves [#317](https://github.com/callstackincubator/voltra/issues/317).

## Introduction

Android exposes a long list of fields on every notification: lock-screen visibility, an accent
colour, a category, a timeout, group placement, and more. Issue #317 asks for the ones an app needs
to build a rideshare, delivery or workout notification that behaves itself in the shade.

None of them is difficult to apply. What is expensive to reverse is where each one lives in Voltra's
API. An ongoing notification is driven from two places at once — an app calling
`startAndroidOngoingNotification` and a server producing payloads for a remote push — and a field put
on the wrong side of that line is either lost on every update or has to be re-sent by a server that
knows nothing about the app's policy. Adding the same field twice, once on each side, is worse: the
two copies drift and the app cannot tell which one wins.

This ADR fixes the rule that chooses between the two, records which fields went where, and records
what was refused and why.

## Context

Voltra's Android ongoing notification is a record plus a payload.

The record is keyed by `notificationId` and lives in `SharedPreferences`. It holds the channel, the
small icon, the deep link, and the promotion request. It is written by the app, merged on every
update, and never sent by the server unless the push carries options.

The payload is a JSON document produced by `renderAndroidOngoingNotificationPayload` from JSX, and
it is what a server sends. It holds the title, the text, the progress, the icons and the actions. The
native side replaces it wholesale on every post; nothing about the previous payload survives.

That split already works, and every field added so far has landed on one side of it without
argument. A field like `visibility` has no obvious side: it is presentation, which suggests the
payload, and it is a policy decision, which suggests the record.

Three properties of the payload make the choice consequential:

- The payload is replaced wholesale on every update, as it must be: an update that drops `subText`
  posts without sub text, and that is correct for content.
- The payload is the server's output. A server that renders a delivery's progress has no idea whether
  the app wants its notifications mirrored to a Wear companion.
- The payload format is versioned (`v: 1`) and shared with `@use-voltra/android-server`, so a key
  added there is a promise about what every server may send and what every app release must ignore.

## Decision

### Three homes, and the test that chooses between them

1. **Options** (`StartAndroidOngoingNotificationOptions`, `UpdateAndroidOngoingNotificationOptions`,
   persisted in `AndroidOngoingNotificationRecord`): how the system should treat this notification for
   its whole lifetime. Set once, kept across updates, and also sendable in the `options` object of a
   remote push. Channel, id, and deep link are already here; visibility, colour, category, timeout,
   local-only, group and sort key join them.
2. **Payload display props** (`AndroidOngoingNotification.Progress` and `.BigText` props): what the
   notification says right now. Replaced wholesale on every update, like every other payload field.
   Title, text and progress are already here; the public version text, `showWhen` and
   `chronometerCountDown` join them.
3. **Per-post options** (update options only, never persisted): flags that describe this one post.
   Today there is one, `alert`.

The test: **if a server that renders payloads but knows nothing about the app's policy could
reasonably be expected to send the value on every update, it is payload. If losing the value on an
update would be a bug, it is an option.**

`publicVersion` is the case that shows the rule working. "Ride in progress" is text, so it travels
with the rest of the text: a delivery app's server can send a different public line per update, and
an update that omits it posts without one, exactly as an update that omits `subText` does.
`visibility` sits beside it and does the opposite: it is the app's privacy policy, not the server's
message, so it is an option that survives every update until the app changes it. A notification can
therefore be private with a public version chosen per update.

### What went where

| Field                                   | Home                     | Default                                     |
| --------------------------------------- | ------------------------ | ------------------------------------------- |
| `visibility`                            | option                   | system default, `private`                   |
| `publicVersion`                         | payload prop             | none                                        |
| `color`                                 | option                   | none                                        |
| `category`                              | option                   | derived from the payload kind               |
| `timeoutMs`                             | option, applied per post | none                                        |
| `localOnly`                             | option                   | `false`                                     |
| `group`, `sortKey`                      | option                   | none                                        |
| `allowSystemGeneratedContextualActions` | option                   | platform default, `true`                    |
| `showWhen`                              | payload prop             | `true` when the payload carries a timestamp |
| `chronometerCountDown`                  | payload prop             | `false`                                     |
| `alert`                                 | per-post option          | `false`                                     |

`timeoutMs` is the one field whose home and its effect differ: it is an option, because the decision
to let a notification expire is the app's, but it is applied on every post, which restarts the timer
on each update. An expiry that counted from the first post would retire a notification that is still
being updated.

### Refused, with the reason

Some fields Android exposes are deliberately not in the API, because accepting them would break
something Voltra already promises:

- **`setColorized`** and **`setGroupSummary`** each disqualify a notification from Live Update
  promotion, which is the whole point of an ongoing notification on Android 16. Colourising is also a
  no-op for the styles Voltra uses outside a foreground service, which Voltra does not run.
- **Badges** (`setNumber`, `setBadgeIconType`): the launcher dot is owned by the notification channel
  the app already creates, and a count is meaningless for a single ongoing item.
- **Priority** below API 26: two API levels, deprecated, and channel importance is the app's
  responsibility from 26 on.
- **Sound, vibration, lights** and any "silent" flag: all channel-driven and deprecated since API 26.
- **`setAutoCancel`**: the ongoing lifecycle is owned by `stop`. A tap-cancel does not go through the
  delete intent, so the record would stay active while the notification was gone.
- **`setSettingsText`** (needs a notification-preferences intent filter the config plugin does not
  set up), **`setContentInfo`** (deprecated), **`setTicker`** (accessibility-only, and TalkBack reads
  title and text without it). Each is reversible on its own if a real need appears.
- **Group alert behaviour**: only meaningful together with a summary Voltra does not post.

Nothing this ADR adds can make `hasPromotableCharacteristics()` return false, and a later eligibility
precheck should treat every field above as allowed.

### Three states, not a nullable field

A persisted option that can be changed on update needs to tell three things apart: not sent, sent as
`null`, and sent with a value. A nullable Kotlin field carries two. `AndroidOngoingNotificationOption`
is a three-case sealed type, read from the bridge with `hasKey` and `isNull`, and merged into the
stored record with `mergedWith`. The existing `?:` merge in `createMergedRecord` cannot express
clearing, so the presentation options merge in one place on the record's own type instead.

`alert` is not merged, not stored and not read back: the next update is silent again unless it asks.
The pre-existing options (`smallIcon`, `deepLinkUrl`, `requestPromotedOngoing`, `fallbackBehavior`)
keep their old two-state merge; widening them is a separate decision with its own migration story.

### Where the code lives

In `packages/android-client/android/src/main/java/voltra/ongoingnotification`, which already owns the
payload and the record:

- `AndroidOngoingNotificationOption.kt` — the three-state type and `mergedWith`.
- `AndroidOngoingNotificationPresentation.kt` — the persisted presentation record, its update type,
  the builder application with its API gates, and the option-to-platform-constant mappings.

`VoltraRNBridgeExtensions.kt` keeps sole ownership of reading a `ReadableMap`, including the three
states. `VoltraNotificationManager.kt` keeps building the notification and its public version, and no
longer owns a colour parser of its own.

In `@use-voltra/android`, the option and prop types, and the payload validation in the renderer. In
`@use-voltra/android-client`, `ongoing-notification/options.ts` owns both halves of every options
object that crosses the bridge: its validation and its shape. The validator is a map keyed by every
key of the presentation options type, so a new option cannot be added to the public type without
saying how it is validated, and the forwarding step drops only what the caller left out. This is the
replacement for the pattern the issue found, where a new option had to be added in four places and was
silently dropped when it was not.

### Who validates what

JavaScript validates shape before any native call, for local calls and for the `options` object of a
push, since both go through the same function. It rejects a bad `visibility`, `category`, `color`,
`timeoutMs`, `group`, `sortKey`, `localOnly`, `alert`, `showWhen`, `chronometerCountDown` and
`publicVersion`, naming the option.

Native validates the one thing JavaScript cannot: whether a colour string resolves to a static colour
rather than a dynamic theme token. That rejects the promise rather than throwing out of the
TurboModule method, which also fixes the pre-existing `channelId` case that had the same shape. A
category or visibility that a newer release might allow is ignored with a warning instead, because the
alternative is a push written for the future failing on the device that has to show it today.

## Consequences

- Apps get the standard presentation fields without a second API to learn, and the docs can say where
  a field belongs without qualifying it.
- An update cannot accidentally drop an app's privacy settings, because they are options; and a server
  can vary the lock-screen copy per update, because it is payload.
- Every new option costs one validator entry and nothing else in the client, and one read plus one
  merge line in the native layer.
- Clearing works for the presentation options only. `smallIcon` and its neighbours still cannot be
  cleared by an update, and the docs say so rather than implying the whole options object behaves the
  same way.
- The payload stays at `v: 1`: the new payload keys are optional and unknown keys are ignored, so an
  older installed release ignores them and a newer server does not break it.
- Whether the system delivers the delete intent when a notification times out is a device behaviour
  this repo cannot assert; it is documented as needing a device check, and the docs say a timed-out
  notification is reported as dismissed and needs `stop` before it can start again.
