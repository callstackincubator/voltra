# ADR 0002: Remote props for Dynamic Widgets

Status: Proposed

Tracks [#176](https://github.com/callstackincubator/voltra/issues/176).

## Introduction

Today a widget that wants fresh data without the app running has one option:
`serverUpdate` on a payload-driven widget. The server must run Voltra's JSX
renderer and return a full UI payload. That rules out backends written in
PHP, C#, Go, or anything that is not Node.

This ADR adds a second option for Dynamic Widgets: the device fetches a plain
JSON object from any HTTP endpoint and passes it as `props` to the widget's
bundled JS entry. Rendering stays on the device. The server never sees a
component tree.

```
Widget → HTTP GET/POST → JSON object → props → on-device render → screen
```

We call the feature **remote props**.

## Context

### What exists

Both platforms already have the two halves we need, but they are wired to
opposite engines.

| Half                         | iOS                                                                                           | Android                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Fetch a URL on a schedule    | `VoltraWidgetServerFetcher` + `VoltraHomeWidgetProvider.serverTimeline` (payload engine only) | `VoltraWidgetUpdateWorker` → `PayloadWidgetUpdateWorker` (WorkManager, payload engine only)                        |
| Render bundled JS from props | `VoltraClientWidgetProvider` + `VoltraJSRenderer` (JSC), props in App Group `UserDefaults`    | `VoltraClientGlanceWidget` + `VoltraJSRenderer` (Hermes), props in SharedPreferences `voltra_dynamic_widget_props` |
| Credentials for the fetch    | Shared Keychain (`VoltraKeychainHelper`), `setWidgetServerCredentials`                        | Tink-encrypted DataStore `VoltraWidgetCredentialStore` in `voltra.widget.payload`                                  |
| Refresh button               | `VoltraRefreshIntent` (iOS 17+, `reloadTimelines`)                                            | `VoltraRefreshActionCallback` → `PayloadRefreshActionCallback` (inline fetch, not WorkManager)                     |
| App-triggered reload         | `reloadWidgets()` → `reloadTimelines(ofKind:)`                                                | `reloadAndroidWidgets()` → one-time WorkManager request                                                            |

Facts that shape the design:

- A Dynamic Widget and `serverUpdate` on the same config entry is not rejected
  today. iOS silently picks the Dynamic path and ignores the URL. Android
  generators skip `serverUpdate` for Dynamic Widgets, and the payload worker
  cancels itself when it meets a Dynamic id.
- The Dynamic timeline on iOS is always `.never`. Only `reloadTimelines` or
  WidgetKit lifecycle events re-render it. Remote props need a real schedule.
- On Android the whole Dynamic path runs in the app process. The Hermes
  runtime is one per process, guarded by one lock, never torn down, and the
  render runs synchronously inside Glance composition with no timeout.
- On iOS the widget extension has a 30 MB memory ceiling and WidgetKit can
  halt it before a slow network call finishes. Apple's guidance: keep
  `getSnapshot` local, do network work in `getTimeline`, and keep entries
  five minutes or more apart. Frequently viewed widgets get roughly 40 to 70
  reloads per day. Reloads caused by an App Intent (the refresh button) or
  by the app being in the foreground do not count against that budget.
- WorkManager periodic work has a 15 minute floor, default exponential
  backoff starting at 30 seconds, and a `NetworkType.CONNECTED` constraint
  already used by the payload worker.
- Glance shows a "Can't show content" box when composition throws.
  `onCompositionError` (Glance 1.1+) lets us draw our own fallback.
- ADR 0000 forbids `voltra.dynamicwidget` from depending on
  `voltra.widget.payload`. The credential store lives in the payload package.

Dynamic Live Activities (ADR 0001) already follow the "send JSON props, render
on device" model, but only through the app or APNs. This ADR brings the same
model to widgets with the device pulling instead of the server pushing.

### What the issue asks for

1. Any backend, any language. The response is data, not UI.
2. Not only GET. The reporter noticed `VoltraWidgetUpdateWorker` is GET-only.

### Rules from the maintainers

1. Keep the new logic in its own directory or package per platform.
2. Choose the implementation from config or environment. Do not sprinkle
   `if (isRemote)` through the existing on-device and payload paths.
3. No Voltra-specific server code required. A hand-written PHP script must be
   enough.

## Decision

### Config

A Dynamic Widget opts in with a new `remoteProps` key. `serverUpdate` stays
exactly as it is and keeps meaning "payload engine, Voltra SSR endpoint".

```json
{
  "id": "portfolio",
  "entry": "./widgets/ios/portfolio.tsx",
  "initialStatePath": "./widgets/ios/portfolio.tsx",
  "remoteProps": {
    "url": "https://api.example.com/widgets/portfolio",
    "method": "GET",
    "headers": { "X-Client": "widget" },
    "body": { "fields": ["balance", "chart"] },
    "intervalMinutes": 30,
    "refresh": true
  }
}
```

| Field             | Required | Notes                                                                                                   |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `url`             | yes      | `https` only in release. `http` allowed only for localhost / `10.0.2.2` in dev, same as `serverUpdate`. |
| `method`          | no       | `GET` (default) or `POST`.                                                                              |
| `headers`         | no       | Static headers baked into the build. Never put secrets here; use credentials.                           |
| `body`            | no       | JSON, only with `POST`. Sent as `application/json`.                                                     |
| `intervalMinutes` | no       | Default 15, floor 15 on both platforms.                                                                 |
| `refresh`         | no       | Native refresh button, same look as the payload one. Default false.                                     |

Validation in the shared Expo plugin and CLI:

- `remoteProps` requires `entry`. Error otherwise.
- `remoteProps` and `serverUpdate` on the same widget is an error.
- `entry` plus `serverUpdate` becomes an error too. It is undefined behaviour
  today, so nobody can rely on it, but it is still called out in the
  changeset.
- iOS: `remoteProps` requires `groupIdentifier` (props live in the App Group)
  and derives `keychainGroup` the same way `serverUpdate` does.

### Request contract (what any backend sees)

```
GET https://api.example.com/widgets/portfolio
    ?widgetId=portfolio&platform=ios&theme=dark&locale=en-US
Authorization: Bearer <token>          # only if setWidgetServerCredentials was called
Accept: application/json
If-None-Match: "<etag from last 200>"  # only if the last response had one
User-Agent: VoltraWidget/<version> (iOS/<os>)
X-...: ...                             # static headers from config, then credential headers
```

Query parameters mirror the payload engine (`widgetId`, `platform`, `theme`)
plus `locale`. There is no `family`: one fetch serves every size and every
instance of a widget id, so props must be size-agnostic and the entry
function picks the layout from `env.widgetFamily`, as it does today. The
same names are used for `GET` and `POST`; `POST` adds the static `body`.

### Response contract

- `200` with `Content-Type: application/json` and a JSON **object**. That
  object is the props, verbatim. Nothing else is required.
- Optional `ETag`. We send it back as `If-None-Match`; a `304` means "keep
  what you have, treat as fresh".
- Optional `Cache-Control: max-age=N` shortens or lengthens the next fetch,
  clamped to the 15 minute floor and 24 hours.
- Optional `Retry-After` on `429` / `503` is honoured, with the same clamp.
- Body cap: 256 KB. Larger responses are treated as a parse error.
- Arrays, primitives, or `null` at the top level are a parse error. Props
  must be an object because that is what the entry function receives.

Nothing here needs Voltra on the server. `@use-voltra/server` may later gain
a tiny typed helper for people who do use Node, but it is optional and not
part of this ADR.

### What the widget sees

Props arrive as the first argument, exactly like `updateDynamicWidget`. The
fetch outcome is exposed on `env` so a widget can show "offline" or "updated
3 min ago" without the server doing anything:

```ts
env.remoteProps?: {
  status: 'fresh' | 'stale' | 'never'   // never = no successful fetch yet
  fetchedAt?: number                    // epoch ms of last 200/304
  error?: 'network' | 'http' | 'unauthorized' | 'parse' | 'render'
  httpStatus?: number
}
```

`env.remoteProps` is `undefined` on widgets without `remoteProps`, so existing
widgets are untouched.

### Where the code lives

**Shared TypeScript**

- `packages/expo-plugin/src/remote-props.ts`: type, validation, and the
  per-platform serialization helpers. The Expo plugins and the CLI
  (`packages/cli/src/config/normalize.ts`, which today has its own
  `serverUpdate` rules) both call it, so the rules exist once.
- `.voltra/manifest.*.json` stays `{id, entry}` only. Metro does not need to
  know about remote props.
- `packages/core/src/widget-environment.ts`: the `remoteProps` env field.

**iOS**: new folder `packages/ios-client/ios/shared/RemoteProps/`, compiled
into both the app and the extension like the rest of `shared/`.

- `RemotePropsConfig` reads a new `Voltra_WidgetRemoteProps` Info.plist
  dictionary (per widget id: url, method, headers, body, interval, refresh).
- `RemotePropsFetcher` builds the request from config, credentials, theme,
  locale, and stored ETag. `URLSession`, 15 s timeout, no retries in
  the call.
- `RemotePropsStore` persists `{props, etag, fetchedAt, status, error}` per
  widget id in the App Group under `Voltra_RemoteProps_v1_<id>`. It writes
  into the existing `DynamicWidgetPropsStore` slot on success so the render
  path does not know where props came from.
- `RemotePropsResolver` is the actor that coalesces concurrent `getTimeline`
  calls for the same widget (one fetch per widget id per 3 s window, the
  payload engine already does this for families).
- `RemotePropsTimelineProvider`: a `TimelineProvider` that wraps the existing
  `VoltraClientWidgetProvider`. `placeholder` and `getSnapshot` stay local.
  `getTimeline` fetches, parses, does one trial render through the existing
  `VoltraJSRenderer` (the bundle is already evaluated at that point), commits
  the props only if the trial render succeeds, then returns one entry with
  `.after(nextDate)`. "Fetch, parse, trial-render, commit" is the rule on
  both platforms.

**Android**: new package `voltra.dynamicwidget.remote`.

- `RemotePropsWorker` (`CoroutineWorker`, new class, so no WorkManager
  pinning problem). Resolves kind first, rejects anything but `Dynamic`,
  fetches, parses, trial-renders through the existing `VoltraJSRenderer`
  (same process, same lock), commits, then calls the existing
  `triggerDynamicWidgetGlanceUpdate`. The worker never pushes
  `RemoteViews`; drawing stays in `VoltraClientGlanceWidget`.
- `RemotePropsScheduler`: periodic unique work `voltra_remote_props_<id>`,
  `NetworkType.CONNECTED`, explicit exponential backoff (30 s start, capped
  by WorkManager at 5 h), `ExistingPeriodicWorkPolicy.UPDATE`, plus a
  one-time expedited request for "refresh now".
- `RemotePropsStore`: same record as iOS, in a new SharedPreferences file
  `voltra_remote_props`. On success it also writes the existing
  `DynamicWidgetPropsStore`.
- `RemotePropsRefreshActionCallback`: new Glance `ActionCallback` that
  enqueues the one-time work. It does not fetch inline, unlike the payload
  button, because inline fetch inside an `ActionCallback` has no retry and
  no network constraint.
- `VoltraRemoteClientWidgetReceiver`: a subclass of
  `VoltraClientWidgetReceiver` that schedules on first `onUpdate` and cancels
  in `onDeleted` when the last instance goes. The generator emits it for
  widgets with `remoteProps`.

**Credential store**: the Android credential store and crypto manager move
from `voltra.widget.payload` to `voltra.widget` (shared). Same DataStore
file, same keys, so stored tokens survive. This is the one change to
existing packages and it is allowed by ADR 0000's dependency rule.

### How the engine is chosen (rule 2)

Selection happens once, at generate time, and produces a different concrete
type. Runtime code never asks "is this remote?".

- iOS `generateWidgetStruct` already picks `VoltraHomeWidgetProvider` or
  `VoltraClientWidgetProvider`. It gains a third outcome:
  `RemotePropsTimelineProvider`. The content view is unchanged; it reads
  props from the store like it does today.
- Android `kotlin.ts` already emits one of three receiver shapes. It gains a
  fourth: `VoltraRemoteClientWidgetReceiver`.
- The Dynamic render path gets one seam: a `DynamicWidgetEnvironmentSource`
  (iOS protocol / Kotlin interface) that contributes extra env fields. The
  default contributes nothing. The remote one contributes `env.remoteProps`.
  That is the only touch point in existing Dynamic code.

Payload code is not touched at all beyond the credential-store move.

### Scheduling

| Event                                  | iOS                                                             | Android                                                         |
| -------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| Widget added                           | WidgetKit calls `getTimeline` → fetch                           | `onUpdate` → schedule periodic, run once immediately            |
| Periodic                               | `.after(now + interval)`; WidgetKit may stretch it              | WorkManager periodic, 15 min floor                              |
| Refresh button                         | `AppIntent` → `reloadTimelines` (does not count against budget) | `ActionCallback` → expedited one-time work                      |
| `reloadWidgets([id])` from the app     | `reloadTimelines`                                               | expedited one-time work (falls back to Glance update if no URL) |
| `setWidgetServerCredentials` / `clear` | `reloadAllTimelines` (already happens)                          | `reloadAllWidgets` (already happens)                            |
| Widget removed                         | nothing to cancel                                               | cancel unique work on last `onDeleted`                          |
| App upgrade changes id from remote→app | new provider ignores stale store                                | `RemotePropsWorker` sees the kind and cancels itself            |

### Failure handling

The rule everywhere: **the screen never goes blank because of the network.**
Precedence for what is rendered:

1. The latest committed props, whoever wrote them: the last successful fetch
   or the last `updateDynamicWidget` call. `env.remoteProps.status` says
   whether the remote side is `fresh` or `stale` and carries the last error.
2. `{}` with `status: 'never'`, which is what every Dynamic Widget receives
   before its first props today.
3. If rendering itself fails, the prerendered initial state, then the
   existing "Loading…" fallback.

| Situation                                  | iOS                                                                                                                | Android                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| No connectivity / DNS / TLS / timeout      | Render stale, `.after(15 min)`                                                                                     | `Result.retry()` with backoff; periodic run continues regardless                                   |
| `5xx`, `429`, `503`                        | Render stale, `.after(max(15 min, Retry-After))`                                                                   | `Result.retry()`, honour `Retry-After` as initial delay of the next one-time request               |
| `401` / `403`                              | Render stale, `error: 'unauthorized'`, `.after(interval)`. No fast retry.                                          | `Result.failure()` (no backoff spam), stale kept, periodic run continues                           |
| Other `4xx`                                | Treated like `5xx` but without backoff shortening                                                                  | `Result.failure()`; misconfiguration, retrying will not help                                       |
| `304`                                      | Bump `fetchedAt`, status `fresh`                                                                                   | same                                                                                               |
| `2xx` but not JSON, not an object, too big | Keep previous props, `error: 'parse'`, log at error level                                                          | same, `Result.success()` because retrying returns the same body                                    |
| Redirect                                   | Follow same-host redirects only; anything else is an `http` error                                                  | same (`HttpURLConnection` already refuses cross-scheme)                                            |
| Credentials missing, endpoint needs them   | Server answers `401`, handled above. The app calls `setWidgetServerCredentials` later and the reload picks them up | same                                                                                               |
| Credentials cleared (logout)               | Clear the remote store for every `remoteProps` widget, then reload. Widgets fall to step 2.                        | same                                                                                               |
| Fresh props fail the trial render          | Not committed. Previous props stay, `error: 'render'`, next fetch at the normal interval.                          | same. The existing render path already catches JS errors, so Glance's error box is never involved. |
| Bundle missing / eval fails                | Existing behaviour: initial state                                                                                  | Existing behaviour: initial state                                                                  |
| Extension killed mid-fetch (iOS)           | Nothing written; next `getTimeline` fetches again. Store writes are atomic per key.                                | n/a; WorkManager reruns a killed worker                                                            |
| Worker exceeds 10 min (Android)            | n/a                                                                                                                | Cannot happen with 15 s connect/read timeouts and one trial render                                 |
| Memory (iOS 30 MB)                         | Body cap 256 KB, parse with `JSONSerialization` once, keep only the string in memory                               | n/a                                                                                                |
| Two families / instances ask at once       | Resolver coalesces to one fetch per widget id                                                                      | One periodic job per widget id; all instances share the store                                      |
| `updateDynamicWidget` on a remote widget   | Allowed. Writes the same props slot. Last writer wins until the next fetch. Documented as "optimistic update".     | same                                                                                               |
| Theme or locale changes                    | No refetch. `theme`/`locale` are hints for formatting; the widget re-renders from cached props with the new env.   | same                                                                                               |
| Dev mode, Metro bundle                     | Fetch still runs; `http://localhost` allowed as for `serverUpdate`                                                 | same, `10.0.2.2`                                                                                   |

Error reporting to the app: reuse the Dynamic Live Activity pattern
(`VoltraDynamicLiveActivityRenderFailureQueue`) and emit one
`dynamicWidgetRemotePropsFailed` event with `{widgetId, error, httpStatus}`
when the app next subscribes. Rate-limited to one per widget per error kind
until the next success. This is optional for a first release; the `env`
field is the required surface.

### Explicit non-goals

- Per-instance props keyed by `env.configuration`. The props store is per
  widget id on both platforms. A configurable widget with `remoteProps` gets
  the same props for every instance. Sending `configuration` to the server
  is a follow-up that needs a per-instance store first.
- Multi-entry timelines from the server (`[{date, props}]`). Possible later
  as an alternative response shape; not needed for the issue.
- Token refresh. The app owns the token. Voltra only stores and sends it.
- A watchdog for a JS render that never returns. That is a separate change
  that helps every Dynamic Widget, not only remote ones.

## Consequences

**Backward compatible.** Everything is additive:

- New config key only. No existing key changes meaning.
- `serverUpdate` and the payload engine are untouched.
- New Kotlin and Swift class names, new storage keys, new WorkManager work
  names. Nothing pinned by WorkManager or Glance moves.
- Android credential store moves package but keeps its DataStore file and
  keys. It has no public API surface.
- The one behaviour change is that `entry` + `serverUpdate` now fails
  validation. Today it produces a Dynamic Widget that ignores the URL, so
  no working app depends on it. It still gets a changeset note.

**Costs.**

- Two more generated shapes (one per platform) to keep in sync between the
  Expo plugin and the CLI. The shared `remote-props.ts` module limits that.
- The Android Dynamic path now has a background worker, so the "app process
  hosts Hermes" concern also applies while the user is not looking at the
  app. The extra cost per run is one HTTP call and one trial render.
- iOS reload budget is shared with any other widgets in the app. Users who
  set `intervalMinutes: 15` on several widgets will see WidgetKit stretch
  the interval; the docs must say so.

**Docs to add**: `website/docs/v2/{ios,android}/development/remote-props.md`
(plus the `_meta.json` entries) with the request/response contract, a curl
example, and a PHP example. Update `api/plugin-configuration.md` on both
sides and `skills/voltra/references/plugin-schema.md`.
