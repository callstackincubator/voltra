# ADR 0002: Server-driven Dynamic Widgets

Status: Proposed

Tracks [#176](https://github.com/callstackincubator/voltra/issues/176).

## Introduction

Today a widget that wants fresh data without the app running has one option:
`serverUpdate` on a payload-driven widget. The server must run Voltra's JSX
renderer and return a full UI payload. That rules out backends written in
PHP, C#, Go, or anything that is not Node. The fetch is also GET-only with no
way to tell the server which account or range the widget wants.

This ADR extends `serverUpdate` to Dynamic Widgets. When a widget has an
`entry`, the device fetches a plain JSON object from the configured URL and
passes it as `props` to the bundled JS entry. Rendering stays on the device.
The server never sees a component tree. It also adds a JS API that lets the
app shape the request (method, query, headers, body) per widget, for both
engines.

```
Widget → HTTP request → JSON object → props → on-device render → screen
```

## Context

### What exists

Both platforms already have the two halves we need, wired to opposite
engines.

| Half                         | iOS                                                                                           | Android                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Fetch a URL on a schedule    | `VoltraWidgetServerFetcher` + `VoltraHomeWidgetProvider.serverTimeline` (payload engine only) | `VoltraWidgetUpdateWorker` → `PayloadWidgetUpdateWorker` (WorkManager, payload engine only)                        |
| Render bundled JS from props | `VoltraClientWidgetProvider` + `VoltraJSRenderer` (JSC), props in App Group `UserDefaults`    | `VoltraClientGlanceWidget` + `VoltraJSRenderer` (Hermes), props in SharedPreferences `voltra_dynamic_widget_props` |
| Credentials for the fetch    | Shared Keychain (`VoltraKeychainHelper`), `setWidgetServerCredentials`                        | Tink-encrypted DataStore `VoltraWidgetCredentialStore` in `voltra.widget.payload`                                  |
| Refresh button               | `VoltraRefreshIntent` (iOS 17+, `reloadTimelines`)                                            | `VoltraRefreshActionCallback` → `PayloadRefreshActionCallback` (inline fetch, not WorkManager)                     |
| App-triggered reload         | `reloadWidgets()` → `reloadTimelines(ofKind:)`                                                | `reloadAndroidWidgets()` → one-time WorkManager request                                                            |

Facts that shape the design:

- `entry` is already the single thing that decides the render engine. The
  Expo plugin and the CLI detect it at generate time and emit a different
  provider (iOS) or receiver (Android). Nothing at runtime asks which engine
  a widget is.
- `entry` plus `serverUpdate` on the same widget is accepted today and does
  nothing useful. iOS emits the Dynamic provider and ignores the URL. Android
  skips `serverUpdate` for Dynamic Widgets, and the payload worker cancels
  itself when it meets a Dynamic id.
- The request side is identical for both engines: `widgetId`, `platform`,
  `family` (iOS), `theme` as query params, `Authorization: Bearer` plus
  custom headers from the credential store, `Accept: application/json`, a
  Voltra user agent. Only the response and what the device does with it
  differ.
- The Dynamic timeline on iOS is always `.never`. Only `reloadTimelines` or
  WidgetKit lifecycle events re-render it. Server updates need a schedule.
- On Android the whole Dynamic path runs in the app process. The Hermes
  runtime is one per process, guarded by one lock, and the render runs
  synchronously inside Glance composition.
- On iOS the widget extension has a 30 MB memory ceiling and WidgetKit can
  halt it before a slow network call finishes. Apple's guidance: keep
  `getSnapshot` local, do network work in `getTimeline`, keep entries five
  minutes or more apart. Frequently viewed widgets get roughly 40 to 70
  reloads per day. App Intent reloads (the refresh button) and reloads while
  the app is in the foreground do not count against that budget.
- WorkManager periodic work has a 15 minute floor, default exponential
  backoff starting at 30 seconds, and a `NetworkType.CONNECTED` constraint
  already used by the payload worker.
- Neither platform HTTP stack sends a body with GET. Apple DTS confirms
  `URLSession` sends `Content-Length` and drops the body. Android's
  `HttpURLConnection` (OkHttp 2 underneath) silently switches GET to POST
  when `doOutput` is set; OkHttp 3 throws.
- ADR 0000 forbids `voltra.dynamicwidget` from depending on
  `voltra.widget.payload`. The credential store lives in the payload package.
- Dynamic Live Activities (ADR 0001) already use "send JSON props, render on
  device", but only pushed from the app or APNs.

### What the issue asks for

1. Any backend, any language. The response is data, not UI.
2. Not only GET.

### Rules from the maintainers

1. Keep the new logic in its own directory or package per platform.
2. Choose the implementation from config. Do not sprinkle `if (isDynamic)`
   through the existing on-device and payload paths.
3. No Voltra-specific server code required. A hand-written PHP script must be
   enough.

## Decision

### Three orthogonal knobs in app.json

- `entry` decides how the widget renders: bundled JS on device, or a payload.
- `serverUpdate` decides where data comes from. Unchanged shape:
  `{ url, intervalMinutes, refresh }`.
- `initialStatePath` decides the first paint.

A widget with `entry` and `serverUpdate` is a **server-driven Dynamic
Widget**. No new config key.

```json
{
  "id": "portfolio",
  "entry": "./widgets/ios/portfolio.tsx",
  "initialStatePath": "./widgets/ios/portfolio.tsx",
  "serverUpdate": {
    "url": "https://api.example.com/widgets/portfolio",
    "intervalMinutes": 30,
    "refresh": true
  }
}
```

Validation, in the shared module both Expo plugins and the CLI call:

- iOS: `entry` plus `serverUpdate` requires `groupIdentifier` (props live in
  the App Group). `keychainGroup` is derived exactly as it is today for any
  `serverUpdate`.
- One set of interval numbers for both engines. Default 15, floor 15. Today
  the CLI floors iOS at 1 and defaults Android to 60 while the Expo template
  uses 15; the shared validator owns the numbers from now on.

### Request contract (what any backend sees)

```
GET https://api.example.com/widgets/portfolio
    ?widgetId=portfolio&platform=ios&family=systemMedium&theme=dark&locale=en-US
Authorization: Bearer <token>          # credentials layer, if set
Accept: application/json
If-None-Match: "<etag from last 200>"  # if the last response had one
User-Agent: VoltraWidget/<version> (iOS/<os>)
```

Same as today plus `locale`. `family` stays for parity; Android sends its
`WxH` size. One fetch serves every size and instance of a widget id, so props
must be size-agnostic and the entry picks its layout from `env.widgetFamily`
as it does now.

Everything above the blank line can be changed by the app through the
request API below: method, extra query params, extra headers, a body.

### Response contract for Dynamic Widgets

- `200` with `Content-Type: application/json` and a JSON **object**. That
  object is the props, verbatim. Nothing else is required.
- Optional `ETag`, sent back as `If-None-Match`. `304` means keep what you
  have and treat it as fresh.
- Optional `Cache-Control: max-age=N` moves the next fetch, clamped to the 15
  minute floor and 24 hours. `Retry-After` on `429` / `503` is honoured with
  the same clamp.
- Body cap 256 KB. Arrays, primitives, or `null` at the top level are a parse
  error.
- A body that looks like a Voltra payload (top-level `v` plus `e` or
  `variants`) is rejected with a specific error: the widget has `entry`, the
  server should return props. This is the one footgun of sharing the key and
  it must fail loudly.

Payload widgets keep their existing response contract.

### Request API (both engines)

```ts
type WidgetServerRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' // default GET
  query?: Record<string, string>
  headers?: Record<string, string>
  body?: JsonValue // sent as application/json
}

setWidgetServerRequest(request: WidgetServerRequest, options?: { widgetId?: string }): Promise<void>
clearWidgetServerRequest(options?: { widgetId?: string }): Promise<void>

// unchanged signatures, now thin wrappers over the same store
setWidgetServerCredentials({ token, headers? }): Promise<void>
clearWidgetServerCredentials(): Promise<void>
```

The store has three layers. Each call replaces its own layer whole. The
request the device sends is the flatten of the layers, later ones winning:

```
credentials  (global)   ← setWidgetServerCredentials writes Authorization + headers here
global       (global)   ← setWidgetServerRequest(request)
widget       (per id)   ← setWidgetServerRequest(request, { widgetId })
```

- `headers` and `query` merge per key. `method` and `body` come from the
  highest layer that sets them.
- Voltra's own query keys (`widgetId`, `platform`, `family`, `theme`,
  `locale`) are reserved; a `query` that names one is rejected at call time.
- No validation of method against body. A body with GET or HEAD is stored as
  given. The native builder drops it and logs a warning naming the widget,
  because neither platform can send it and Android would silently turn the
  request into a POST. The docs say so.
- Each layer is capped at 16 KB serialized. Layers are stored where
  credentials are stored today: shared Keychain on iOS, the Tink-encrypted
  DataStore on Android. The existing token and header accounts are the
  storage of the credentials layer, so nothing migrates.
- Setting or clearing a layer reloads the widgets it affects: one widget for
  the widget layer, every server-driven widget for the other two. That is
  today's behaviour for credentials.
- `clearWidget` / `clearAllWidgets` also drop the widget layer for those ids.
  Logout is "clear credentials, clear request", documented, because a token
  refresh must not wipe an account selection.

### One request store, one resolver

The three layers, the config, and the credential store are read through one
abstraction per platform. Both engines call it; neither engine reads
Keychain, DataStore, or Info.plist for request purposes on its own.

**iOS**: new folder `packages/ios-client/ios/shared/WidgetServer/`.

- `WidgetServerConfig`: url, interval, refresh per widget id from the
  existing `Voltra_WidgetServerUrls` / `Intervals` / `Refresh` plist keys.
  Moves out of `VoltraWidgetServerFetcher`.
- `WidgetServerRequestStore`: `setLayer`, `clearLayer`, `resolve(widgetId)`,
  `revision(widgetId)`. Wraps `VoltraKeychainHelper`, which moves here.
- `WidgetServerRequestBuilder`: config + resolved layers + Voltra params +
  stored ETag → `URLRequest`. Applies the GET-body rule.

**Android**: new package `voltra.widget.server`.

- `WidgetServerRequestStore` and `WidgetServerRequestBuilder` with the same
  responsibilities, producing a configured `HttpURLConnection`.
- `VoltraWidgetCredentialStore` and `VoltraCryptoManager` move here from
  `voltra.widget.payload`. Same DataStore file, same keys.
- Config stays inlined in the generated receiver, as today; the receiver
  hands url and interval to whichever scheduler it uses.

Dependency rule, extending ADR 0000: `voltra.widget.payload` and
`voltra.dynamicwidget` may depend on `voltra.widget.server`; it depends on
neither. Same shape on iOS by folder convention.

The payload fetchers on both platforms switch to the builder. With no layers
set the request is byte-for-byte what they send today. This is the one
functional change to payload code and it is what gives payload widgets
non-GET requests too.

### The Dynamic server-update engine

**iOS**: new folder `packages/ios-client/ios/shared/DynamicWidgetServerUpdate/`.

- `DynamicWidgetServerUpdateProvider`: a `TimelineProvider` wrapping the
  existing `VoltraClientWidgetProvider`. `placeholder` and `getSnapshot` stay
  local. `getTimeline` fetches through the builder, parses, does one trial
  render through the already-evaluated `VoltraJSRenderer`, commits only if
  that succeeds, then returns one entry with `.after(nextDate)`.
- `DynamicWidgetServerPropsStore`: `{props, etag, fetchedAt, status, error,
requestRevision}` per widget id in the App Group under
  `Voltra_DynamicWidgetServer_v1_<id>`. On commit it writes the existing
  `DynamicWidgetPropsStore` slot, so the render path does not know where
  props came from.
- `DynamicWidgetServerFetchResolver`: coalesces concurrent `getTimeline`
  calls for one widget id into one fetch per 3 s window, the way the payload
  engine already does.

**Android**: new package `voltra.dynamicwidget.serverupdate`.

- `DynamicWidgetServerUpdateWorker` (`CoroutineWorker`, new class, so
  nothing WorkManager has pinned moves). Resolves kind first and rejects
  anything but `Dynamic`, fetches through the builder, parses, trial-renders
  through `VoltraJSRenderer` (same process, same lock), commits, then calls
  the existing `triggerDynamicWidgetGlanceUpdate`. It never pushes
  `RemoteViews`; drawing stays in `VoltraClientGlanceWidget`.
- `DynamicWidgetServerUpdateScheduler`: periodic unique work
  `voltra_dynamic_widget_server_<id>`, `NetworkType.CONNECTED`, explicit
  exponential backoff, `ExistingPeriodicWorkPolicy.UPDATE`, plus an
  expedited one-time request for "refresh now".
- `DynamicWidgetServerPropsStore`: same record as iOS, SharedPreferences
  file `voltra_dynamic_widget_server`.
- `DynamicWidgetRefreshActionCallback`: new Glance `ActionCallback` that
  enqueues the one-time work. Not an inline fetch like the payload button,
  which has no retry and no network constraint.
- `VoltraServerDrivenClientWidgetReceiver`: subclass of
  `VoltraClientWidgetReceiver` that schedules on first `onUpdate` and cancels
  on the last `onDeleted`.

"Fetch, parse, trial-render, commit" is the rule on both platforms. Props
that do not render are never committed.

### What the widget sees

Props arrive as the first argument, exactly like `updateDynamicWidget`. The
fetch outcome is on `env`, so a widget can show "offline" or "updated 3 min
ago" without server help:

```ts
env.serverUpdate?: {
  status: 'fresh' | 'stale' | 'never'   // never = no successful fetch yet
  fetchedAt?: number                    // epoch ms of last 200/304
  error?: 'network' | 'http' | 'unauthorized' | 'parse' | 'render'
  httpStatus?: number
}
```

`undefined` on widgets without `serverUpdate`. This is the only touch on the
existing Dynamic render path: an environment-source seam (Swift protocol /
Kotlin interface) that the default provider leaves empty.

### How the engine is chosen (rule 2)

Once, at generate time, from `entry` and `serverUpdate`:

| `entry` | `serverUpdate` | iOS provider                        | Android receiver                          |
| ------- | -------------- | ----------------------------------- | ----------------------------------------- |
| no      | no             | `VoltraHomeWidgetProvider`          | `VoltraPayloadWidgetReceiver`             |
| no      | yes            | `VoltraHomeWidgetProvider` (server) | `VoltraPayloadWidgetReceiver` + scheduler |
| yes     | no             | `VoltraClientWidgetProvider`        | `VoltraClientWidgetReceiver`              |
| yes     | yes            | `DynamicWidgetServerUpdateProvider` | `VoltraServerDrivenClientWidgetReceiver`  |

Runtime code never asks "is this server-driven?". The kind resolver, the
props store, and the render path are unchanged.

### Scheduling

| Event                             | iOS                                                             | Android                                      |
| --------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| Widget added                      | WidgetKit calls `getTimeline` → fetch                           | `onUpdate` → schedule periodic, run once now |
| Periodic                          | `.after(now + interval)`; WidgetKit may stretch it              | WorkManager periodic, 15 min floor           |
| Refresh button                    | `AppIntent` → `reloadTimelines` (does not count against budget) | `ActionCallback` → expedited one-time work   |
| `reloadWidgets([id])`             | `reloadTimelines`                                               | expedited one-time work                      |
| Any request layer set or cleared  | reload affected widgets                                         | same                                         |
| Widget removed                    | nothing to cancel                                               | cancel unique work on last `onDeleted`       |
| Release changes a widget's engine | new provider ignores the old store                              | old worker sees the kind and cancels itself  |

### Failure handling

The rule everywhere: **the screen never goes blank because of the network.**
What is rendered, in order:

1. The latest committed props, whoever wrote them: the last successful fetch
   or the last `updateDynamicWidget` call. `env.serverUpdate.status` says
   whether the server side is `fresh` or `stale` and carries the last error.
2. `{}` with `status: 'never'`, which every Dynamic Widget receives before its
   first props today.
3. If rendering itself fails, the prerendered initial state, then the
   existing "Loading…" fallback.

| Situation                                       | iOS                                                                                                                                  | Android                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| No connectivity / DNS / TLS / timeout           | Render stale, `.after(15 min)`                                                                                                       | `Result.retry()` with backoff; the periodic run continues regardless                      |
| `5xx`, `429`, `503`                             | Render stale, `.after(max(15 min, Retry-After))`                                                                                     | `Result.retry()`, `Retry-After` as initial delay of the next one-time request             |
| `401` / `403`                                   | Render stale, `error: 'unauthorized'`, `.after(interval)`. No fast retry.                                                            | `Result.failure()`, stale kept, periodic run continues                                    |
| Other `4xx`                                     | Like `5xx` without backoff shortening                                                                                                | `Result.failure()`; misconfiguration, retrying will not help                              |
| `304`                                           | Bump `fetchedAt`, status `fresh`                                                                                                     | same                                                                                      |
| `2xx` but not JSON, not an object, too big      | Keep previous props, `error: 'parse'`, error log                                                                                     | same, `Result.success()` because retrying returns the same body                           |
| `2xx` payload-shaped body                       | Keep previous props, `error: 'parse'`, log names the mismatch                                                                        | same                                                                                      |
| Redirect                                        | Same-host only; otherwise an `http` error                                                                                            | same (`HttpURLConnection` already refuses cross-scheme)                                   |
| Body with GET/HEAD                              | Sent without body, warning logged                                                                                                    | same                                                                                      |
| Request layer changed mid-fetch                 | Result carries the revision it used; committed only if still current, else dropped. The reload queued by the set call fetches again. | same                                                                                      |
| Credentials missing, endpoint needs them        | Server answers `401`, handled above. Setting them later reloads.                                                                     | same                                                                                      |
| Credentials cleared (logout)                    | Clear the server props store for every server-driven Dynamic Widget, then reload. Step 2.                                            | same                                                                                      |
| Fresh props fail the trial render               | Not committed. Previous props stay, `error: 'render'`, next fetch at the normal interval.                                            | same. The render path already catches JS errors, so Glance's error box is never involved. |
| Bundle missing / eval fails                     | Existing behaviour: initial state                                                                                                    | Existing behaviour: initial state                                                         |
| Extension killed mid-fetch                      | Nothing written; next `getTimeline` fetches again                                                                                    | n/a; WorkManager reruns a killed worker                                                   |
| Worker exceeds 10 min                           | n/a                                                                                                                                  | Cannot happen with 15 s timeouts and one trial render                                     |
| Memory (iOS 30 MB)                              | Body cap 256 KB, parse once, keep only the string                                                                                    | n/a                                                                                       |
| Two families / instances ask at once            | Resolver coalesces to one fetch per widget id                                                                                        | One periodic job per widget id; instances share the store                                 |
| `updateDynamicWidget` on a server-driven widget | Allowed. Same props slot, last writer wins until the next fetch. Documented as "optimistic update".                                  | same                                                                                      |
| Theme or locale changes                         | No refetch. The widget re-renders from cached props with the new env.                                                                | same                                                                                      |
| Dev mode, Metro bundle                          | Fetch still runs; `http://localhost` allowed as for `serverUpdate` today                                                             | same, `10.0.2.2`                                                                          |

Error reporting to the app: reuse the Dynamic Live Activity failure queue
pattern and emit one `dynamicWidgetServerUpdateFailed` event with
`{widgetId, error, httpStatus}` when the app next subscribes, rate-limited
to one per widget per error kind until the next success. Optional for a
first release; the `env` field is the required surface.

### Explicit non-goals

- Per-instance props keyed by `env.configuration`. The props store and the
  request store are per widget id. A configurable widget gets the same props
  for every instance. Sending `configuration` to the server needs a
  per-instance store first.
- Multi-entry timelines from the server (`[{date, props}]`).
- Token refresh. The app owns the token. Voltra stores and sends it.
- GET with a body. Neither platform stack can send it; a custom HTTP client
  is out of scope.
- A watchdog for a JS render that never returns. Separate change, helps every
  Dynamic Widget.

## Consequences

**Backward compatible.** Everything is additive:

- No config key changes shape. `serverUpdate` on a payload widget behaves as
  before.
- Existing credential APIs keep their signatures and semantics; they become
  wrappers over the request store. Stored tokens are read from the same
  Keychain accounts and DataStore keys.
- Payload fetchers send the identical request when no layers are set.
- New Swift and Kotlin class names, storage keys, and work names for the
  Dynamic engine. Nothing pinned by WorkManager or Glance moves.
- Android credential store and crypto manager change package. No public API.
- The one behaviour change: `entry` plus `serverUpdate` goes from "URL
  ignored" to "fetch props". Apps with that config today see the initial
  state; after this they still see the initial state until the server returns
  props, with a clear log about the payload-shaped response. Called out in
  the changeset.

**Costs.**

- One more generated shape per platform to keep in sync between the Expo
  plugin and the CLI.
- The Android Dynamic path gains a background worker in the app process. The
  extra cost per run is one HTTP call and one trial render.
- Servers that require GET with a body are not reachable. Documented.
- iOS reload budget is shared across all widgets in the app; several widgets
  at 15 minutes will be stretched by WidgetKit. Documented.

**Docs**: extend `website/docs/v2/{ios,android}/development/server-driven-widgets.md`
with a "Dynamic Widgets" section (response contract, curl and PHP examples)
and the request API. Update `api/plugin-configuration.md` on both sides,
`dynamic-widgets.md`, and `skills/voltra/references/plugin-schema.md`.
