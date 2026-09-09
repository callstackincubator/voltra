# ADR 0002: Server-driven Dynamic Widgets

Status: Accepted — not yet implemented

Tracks [#176](https://github.com/callstackincubator/voltra/issues/176).

## Introduction

Today a widget that wants fresh data without the app running has one option:
`serverUpdate` on a payload-driven widget. The server must run Voltra's JSX
renderer and return a full UI payload. That rules out backends written in
PHP, C#, Go, or anything that is not Node. The fetch is GET-only, the URL is
frozen at build time, and there is no way to tell the server which account
or range the widget wants.

This ADR extends `serverUpdate` to Dynamic Widgets. When a widget has an
`entry`, the device fetches a plain JSON object from the configured URL and
passes it as `props` to the bundled JS entry. Rendering stays on the device.
The server never sees a component tree. It also turns `serverUpdate` in
app.json into a set of defaults that the app can override at runtime, per
widget, for both engines: URL, interval, method, query, headers, body, and
whether fetching is on at all.

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
- The server URL is read from Info.plist on iOS (with a dormant App Group
  fallback that nothing writes) and is inlined into the generated receiver
  on Android. Neither can change after build.
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
4. app.json is a default, so a widget added before the app ever runs still
   works. Once the app runs it can change any of it.
5. The app may take over a server-driven widget when it has a reason to.

## Decision

### Three orthogonal knobs in app.json

- `entry` decides how the widget renders: bundled JS on device, or a payload.
- `serverUpdate` decides where data comes from, and marks the widget as
  server-driven. Shape unchanged: `{ url, intervalMinutes, refresh }`.
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

`serverUpdate` values are **defaults**. The app can override `url` and
`intervalMinutes` at runtime through the settings API below. `refresh` stays
build-time because it is UI structure generated into Swift and Kotlin.

`url` becomes optional. `serverUpdate: {}` is valid and means "server-driven,
URL supplied at runtime". Until a URL exists the widget does not fetch and
renders like a plain Dynamic Widget. This covers per-tenant backends whose
URL is only known after login.

Validation, in the shared module both Expo plugins and the CLI call:

- `serverUpdate` on a widget without `entry` keeps today's rules on both
  platforms, so no existing config breaks. (The CLI floors iOS at 1 minute
  and defaults Android to 60; the Expo template uses 15.)
- `serverUpdate` on a widget with `entry`: default 15, floor 15 on both
  platforms, warning below 15.
- iOS: `entry` plus `serverUpdate` requires `groupIdentifier` (props live in
  the App Group). `keychainGroup` is derived exactly as it is today.

### Request contract (what any backend sees)

```
GET https://api.example.com/widgets/portfolio
    ?widgetId=portfolio&platform=ios&theme=dark&locale=en-US
Authorization: Bearer <token>          # if the app set one
Accept: application/json
If-None-Match: "<etag from last 200>"  # if the last response had one
User-Agent: VoltraWidget/<version> (iOS/<os>)
```

Dynamic Widgets do not send `family`. One fetch serves every size and
instance of a widget id, so props must be size-agnostic and the entry picks
its layout from `env.widgetFamily` as it does now. Per-instance requests are
a later ADR, when instances become a first-class concept. Payload widgets
keep sending exactly what they send today plus `locale`.

Everything above the blank line can be changed by the app: method, extra
query params, extra headers, a body. `instance` is a reserved query key,
not sent today.

### Response contract for Dynamic Widgets

- `200` with `Content-Type: application/json` and a JSON **object**. That
  object is the props, verbatim. Nothing else is required.
- `ETag` is stored with the URL it came from and sent back as
  `If-None-Match` while the URL is unchanged. `304` means keep what you have
  and treat it as fresh.
- `Cache-Control: max-age=N` moves the next fetch, clamped to the 15 minute
  floor and 24 hours.
- `Retry-After` on `429` / `503` is honoured with the same clamp.
- Body cap 256 KB. Arrays, primitives, or `null` at the top level are a parse
  error.
- A body that looks like a Voltra payload (top-level `v` plus `e` or
  `variants`) is rejected with a specific error: the widget has `entry`, the
  server should return props. This is the one footgun of sharing the key and
  it must fail loudly.

Payload widgets keep their existing response contract.

### Runtime settings API (both engines)

```ts
type WidgetServerUpdateSettings = {
  url?: string
  intervalMinutes?: number
  enabled?: boolean // default true; false stops fetching until set back
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' // default GET
  query?: Record<string, string>
  headers?: Record<string, string>
  body?: JsonValue // sent as application/json
}

setWidgetServerUpdate(settings: WidgetServerUpdateSettings, options?: { widgetId?: string }): Promise<void>
clearWidgetServerUpdate(options?: { widgetId?: string }): Promise<void>

/** @deprecated use setWidgetServerUpdate with an Authorization header */
setWidgetServerCredentials({ token, headers? }): Promise<void>
/** @deprecated */
clearWidgetServerCredentials(): Promise<void>
```

The name mirrors the app.json key because the object is the runtime twin of
`serverUpdate`, not only a request shape.

The store has four layers. The request the device sends and the schedule it
keeps are the flatten of the layers, later ones winning:

```
config       (build-time, read-only)  ← app.json via plist / generated asset
credentials  (global, legacy)         ← deprecated setWidgetServerCredentials
global       (global)                 ← setWidgetServerUpdate(settings)
widget       (per id)                 ← setWidgetServerUpdate(settings, { widgetId })
```

- Each `set` call replaces its own layer whole; `clear` empties it. Clearing
  every runtime layer returns the widget to its app.json defaults.
- `headers` and `query` merge per key. `url`, `intervalMinutes`, `enabled`,
  `method`, and `body` come from the highest layer that sets them.
- Voltra's own query keys (`widgetId`, `platform`, `family`, `theme`,
  `locale`, `instance`) are reserved; a `query` that names one is rejected
  at call time.
- `url` is validated at call time with the same rule as app.json: `https` in
  release, `http` only for localhost / `10.0.2.2` in dev builds.
- No validation of method against body. A body with GET or HEAD is stored as
  given; the native builder drops it and logs a warning naming the widget,
  because neither platform can send it and Android would silently turn the
  request into a POST. Documented.
- Settings for a widget id that is not server-driven (no `serverUpdate` in
  app.json) are rejected with a clear error. The engine is chosen at
  generate time and a runtime URL does not change it.
- Each layer is capped at 16 KB serialized. Layers live where credentials
  live today: shared Keychain on iOS, the Tink-encrypted DataStore on
  Android. The existing token and header accounts are the storage of the
  credentials layer, so nothing migrates. The deprecated functions are two
  line wrappers that write `Authorization: Bearer <token>` plus headers into
  that layer, keeping today's replace-whole semantics.
- Setting or clearing a layer reloads the widgets it affects: one widget for
  the widget layer, every server-driven widget for the other two. On
  Android that also reschedules periodic work with
  `ExistingPeriodicWorkPolicy.UPDATE` when the interval changed, and cancels
  it when `enabled` is false.
- `clearWidget` / `clearAllWidgets` also drop the widget layer for those ids.
  Logout is "clear the global layer", documented.

### Taking over a server-driven widget

Two supported ways, both on purpose:

- **Optimistic update.** `updateDynamicWidget(id, props)` writes the same
  props slot the fetch commits into. Last writer wins until the next fetch.
  Writing props never pauses or delays fetching; the next scheduled fetch
  runs as planned and overwrites them. For a payload widget, `updateWidget`
  does the same with a payload.
- **Take over.** Only `setWidgetServerUpdate({ enabled: false }, { widgetId })`
  stops fetching for that widget. The app then drives it through
  `updateDynamicWidget` for as long as it wants; `enabled: true` or a `clear`
  hands it back to the server. `env.serverUpdate.status` reports `disabled`
  meanwhile so the widget can hide its "updated N min ago" line.

### One settings store, one resolver

Everything that needs server-update settings reads them through **one**
abstraction per platform: a resolver with a single read method. Internally
the resolver is composed of four layer objects that share one small
interface, stacked in a fixed order. Nothing outside the shared package sees
a layer; neither engine reads Keychain, DataStore, Info.plist, or generated
assets for server-update purposes on its own.

```
enum WidgetScope {                             // the key type for everything per widget
  case widget(id: String)                       // the only case in this ADR
  // case instance(id: String, key: String)     // reserved, see "Instance-ready"
}

protocol WidgetServerSettingsLayer {            // one implementation per source
  func settings(for scope: WidgetScope) -> WidgetServerUpdateSettings?   // partial
}

final class WidgetServerSettingsResolver {     // the only read API
  init(layers: [WidgetServerSettingsLayer])    // fixed order: config, credentials, global, widget
  func resolve(_ scope: WidgetScope) -> ResolvedWidgetServerSettings
  func revision(_ scope: WidgetScope) -> Int
}

final class WidgetServerSettingsStore {        // the only write API
  func set(_ settings: WidgetServerUpdateSettings, scope: WidgetScope?)   // nil = global
  func clear(scope: WidgetScope?)
}
```

- The four layers are `ConfigLayer` (build-time defaults, read-only),
  `CredentialsLayer` (legacy, written only by the deprecated functions),
  `GlobalLayer`, and `WidgetLayer`. Each returns a partial settings object or
  nothing. The resolver walks them from lowest to highest and applies the
  merge rules from the API section: per-key merge for `headers` and `query`,
  last-wins for everything else. That rule lives in the resolver, once.
- `resolve` returns a complete object: `url` may be absent (no fetch),
  `intervalMinutes` is always filled (floor applied here), `enabled`
  defaults to true, `method` defaults to GET.
- `revision` increments whenever any layer that can affect the widget
  changes. Fetchers record it and commit only if it is still current.
- Adding a layer later, for example an instance layer above `widget`, is a
  new `WidgetServerSettingsLayer` plus one entry in the order. The resolver
  API and every caller stay as they are.
- `WidgetScope` is the key type for every per-widget store this ADR adds:
  the widget settings layer, the server props store, the ETag, fetch
  coalescing, and the revision. Not a bare `widgetId` string.

**iOS**: new folder `packages/ios-client/ios/shared/WidgetServer/`.

- The four layers, the resolver, and the store as above. `ConfigLayer` reads
  the existing `Voltra_WidgetServerUrls` / `Intervals` plist keys. The three
  runtime layers persist through `VoltraKeychainHelper`, which moves here.
- `WidgetServerRequestBuilder`: resolved settings + Voltra params + stored
  ETag → `URLRequest`. Applies the GET-body rule.

**Android**: new package `voltra.widget.server`.

- Same four layers, resolver, store, and builder, producing a configured
  `HttpURLConnection`. `ConfigLayer` reads a generated asset
  `voltra/widget_server_defaults.json` (same pattern as
  `widget_config_defaults.json`), replacing the URL and interval inlined
  into generated receivers today.
- `VoltraWidgetCredentialStore` and `VoltraCryptoManager` move here from
  `voltra.widget.payload` and back the three runtime layers. Same DataStore
  file, same keys.

Dependency rule, extending ADR 0000: `voltra.widget.payload` and
`voltra.dynamicwidget` may depend on `voltra.widget.server`; it depends on
neither. Same shape on iOS by folder convention.

The payload fetchers and schedulers on both platforms switch to the resolver
and builder in this change. With no runtime layers set, the request and the
schedule are what they are today. This is what gives payload widgets runtime
URLs and non-GET requests too.

### The Dynamic server-update engine

**iOS**: new folder `packages/ios-client/ios/shared/DynamicWidgetServerUpdate/`.

- `DynamicWidgetServerUpdateProvider`: a `TimelineProvider` wrapping the
  existing `VoltraClientWidgetProvider`. `placeholder` and `getSnapshot` stay
  local. `getTimeline` resolves settings; with no URL or `enabled: false` it
  returns a local entry with `.never`. Otherwise it fetches through the
  builder, parses, does one trial render through the already-evaluated
  `VoltraJSRenderer`, commits only if that succeeds, then returns one entry
  with `.after(nextDate)`.
- `DynamicWidgetServerPropsStore`: `{props, etag, etagUrl, fetchedAt,
status, error, settingsRevision}` per `WidgetScope` in the App Group under
  `Voltra_DynamicWidgetServer_v1_<id>`. On commit it writes the existing
  `DynamicWidgetPropsStore` slot, so the render path does not know where
  props came from.
- `DynamicWidgetServerFetchResolver`: coalesces concurrent `getTimeline`
  calls for one scope into one fetch per 3 s window, the way the payload
  engine already does.

**Android**: new package `voltra.dynamicwidget.serverupdate`.

- `DynamicWidgetServerUpdateWorker` (`CoroutineWorker`, new class, so
  nothing WorkManager has pinned moves). Resolves kind first and rejects
  anything but `Dynamic`, resolves settings (no URL or disabled → success,
  no fetch), fetches through the builder, parses, trial-renders through
  `VoltraJSRenderer` (same process, same lock), commits, then calls the
  existing `triggerDynamicWidgetGlanceUpdate`. It never pushes
  `RemoteViews`; drawing stays in `VoltraClientGlanceWidget`.
- `DynamicWidgetServerUpdateScheduler`: periodic unique work
  `voltra_dynamic_widget_server_<id>` from the resolved interval,
  `NetworkType.CONNECTED`, explicit exponential backoff,
  `ExistingPeriodicWorkPolicy.UPDATE`, plus an expedited one-time request
  for "refresh now".
- `DynamicWidgetServerPropsStore`: same record as iOS, SharedPreferences
  file `voltra_dynamic_widget_server`.
- `DynamicWidgetRefreshActionCallback`: new Glance `ActionCallback` that
  enqueues the one-time work. Not an inline fetch like the payload button,
  which has no retry and no network constraint.
- `VoltraServerDrivenClientWidgetReceiver`: subclass of
  `VoltraClientWidgetReceiver` that schedules on first `onUpdate` and cancels
  on the last `onDeleted`.

"Fetch, parse, trial-render, commit" is the rule on both platforms, and the
unit of all four steps is a `WidgetScope`. Props that do not render are never
committed. The trial render uses one
environment (the widget's first supported family on iOS, the target cell
size on Android); a widget that only throws for another size slips through,
and that is accepted.

### What the widget sees

Props arrive as the first argument, exactly like `updateDynamicWidget`. The
fetch outcome is on `env`, so a widget can show "offline" or "updated 3 min
ago" without server help:

```ts
env.serverUpdate?: {
  status: 'fresh' | 'stale' | 'never' | 'disabled'   // never = no successful fetch yet
  fetchedAt?: number                                  // epoch ms of last 200/304
  error?: 'network' | 'http' | 'unauthorized' | 'parse' | 'render'
  httpStatus?: number
}
```

`undefined` on widgets without `serverUpdate`. `env.instance` is reserved
and absent today. Stale props never expire on
their own; the widget has `fetchedAt` and decides. This is the only touch on
the existing Dynamic render path: an environment-source seam (Swift protocol
/ Kotlin interface) that the default provider leaves empty.

### How the engine is chosen (rule 2)

Once, at generate time, from `entry` and the presence of the `serverUpdate`
key:

| `entry` | `serverUpdate` | iOS provider                        | Android receiver                          |
| ------- | -------------- | ----------------------------------- | ----------------------------------------- |
| no      | no             | `VoltraHomeWidgetProvider`          | `VoltraPayloadWidgetReceiver`             |
| no      | yes            | `VoltraHomeWidgetProvider` (server) | `VoltraPayloadWidgetReceiver` + scheduler |
| yes     | no             | `VoltraClientWidgetProvider`        | `VoltraClientWidgetReceiver`              |
| yes     | yes            | `DynamicWidgetServerUpdateProvider` | `VoltraServerDrivenClientWidgetReceiver`  |

Runtime code never asks "is this server-driven?". The kind resolver, the
props store, and the render path are unchanged.

### Scheduling

| Event                             | iOS                                                             | Android                                                     |
| --------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Widget added                      | WidgetKit calls `getTimeline` → fetch                           | `onUpdate` → schedule periodic, run once now                |
| Periodic                          | `.after(now + interval)`; WidgetKit may stretch it              | WorkManager periodic, 15 min floor                          |
| Refresh button                    | `AppIntent` → `reloadTimelines` (does not count against budget) | `ActionCallback` → expedited one-time work                  |
| `reloadWidgets([id])`             | `reloadTimelines`                                               | expedited one-time work                                     |
| Any settings layer set or cleared | reload affected widgets                                         | reload, reschedule on interval change, cancel when disabled |
| No URL yet / `enabled: false`     | local entry, `.never`                                           | periodic work not scheduled or cancelled                    |
| Widget removed                    | nothing to cancel                                               | cancel unique work on last `onDeleted`                      |
| Release changes a widget's engine | new provider ignores the old store                              | old worker sees the kind and cancels itself                 |

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

| Situation                                       | iOS                                                                                                                                           | Android                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| No connectivity / DNS / TLS / timeout           | Render stale, `.after(15 min)`                                                                                                                | `Result.retry()` with backoff; the periodic run continues regardless                      |
| `5xx`, `429`, `503`                             | Render stale, `.after(max(15 min, Retry-After))`                                                                                              | `Result.retry()`, `Retry-After` as initial delay of the next one-time request             |
| `401` / `403`                                   | Render stale, `error: 'unauthorized'`, `.after(interval)`. No fast retry.                                                                     | `Result.failure()`, stale kept, periodic run continues                                    |
| Other `4xx`                                     | Like `5xx` without backoff shortening                                                                                                         | `Result.failure()`; misconfiguration, retrying will not help                              |
| `304`                                           | Bump `fetchedAt`, status `fresh`                                                                                                              | same                                                                                      |
| `2xx` but not JSON, not an object, too big      | Keep previous props, `error: 'parse'`, error log                                                                                              | same, `Result.success()` because retrying returns the same body                           |
| `2xx` payload-shaped body                       | Keep previous props, `error: 'parse'`, log names the mismatch                                                                                 | same                                                                                      |
| Redirect                                        | Same-host only; otherwise an `http` error                                                                                                     | same (`HttpURLConnection` already refuses cross-scheme)                                   |
| Body with GET/HEAD                              | Sent without body, warning logged                                                                                                             | same                                                                                      |
| Settings changed mid-fetch                      | Result carries the settings revision it used; committed only if still current, else dropped. The reload queued by the set call fetches again. | same                                                                                      |
| URL changed                                     | Stored ETag is ignored because it belongs to the old URL                                                                                      | same                                                                                      |
| Runtime URL invalid (not https in release)      | Rejected at call time, nothing stored                                                                                                         | same                                                                                      |
| Settings for a non-server-driven widget         | Rejected at call time                                                                                                                         | same                                                                                      |
| Credentials missing, endpoint needs them        | Server answers `401`, handled above. Setting them later reloads.                                                                              | same                                                                                      |
| Logout (global layer cleared)                   | Clear the server props store for every server-driven Dynamic Widget, then reload. Step 2.                                                     | same                                                                                      |
| Fresh props fail the trial render               | Not committed. Previous props stay, `error: 'render'`, next fetch at the normal interval.                                                     | same. The render path already catches JS errors, so Glance's error box is never involved. |
| Bundle missing / eval fails                     | Existing behaviour: initial state                                                                                                             | Existing behaviour: initial state                                                         |
| Extension killed mid-fetch                      | Nothing written; next `getTimeline` fetches again                                                                                             | n/a; WorkManager reruns a killed worker                                                   |
| Worker exceeds 10 min                           | n/a                                                                                                                                           | Cannot happen with 15 s timeouts and one trial render                                     |
| Memory (iOS 30 MB)                              | Body cap 256 KB, parse once, keep only the string                                                                                             | n/a                                                                                       |
| Two families / instances ask at once            | Resolver coalesces to one fetch per widget id                                                                                                 | One periodic job per widget id; instances share the store                                 |
| `updateDynamicWidget` on a server-driven widget | Allowed. Same props slot, last writer wins until the next fetch. Use `enabled: false` to make it stick.                                       | same                                                                                      |
| Theme or locale changes                         | No refetch. The widget re-renders from cached props with the new env.                                                                         | same                                                                                      |
| Dev mode, Metro bundle                          | Fetch still runs; `http://localhost` allowed as for `serverUpdate` today                                                                      | same, `10.0.2.2`                                                                          |

### Later, on purpose

- Per-instance requests and props. Own ADR; see "Instance-ready" below for
  what this ADR fixes in advance.
- A failure event to the app (`dynamicWidgetServerUpdateFailed`, one per
  widget per error kind, reusing the Dynamic Live Activity failure queue).
  `env.serverUpdate` is enough for widgets; the event is for dashboards.
- Multi-entry timelines from the server (`[{date, props}]`).
- A watchdog for a JS render that never returns. Helps every Dynamic Widget.
- Runtime `refresh` toggle. Needs the button to be drawn from a runtime
  flag instead of generated code.

### Instance-ready

There is no `instanceId` in the codebase today. The open Android PR
[#218](https://github.com/callstackincubator/voltra/pull/218) scopes
`env.configuration` per placement using the system `appWidgetId`, Android
only, and its author notes that per-instance server fetches need
instance-keyed URL and cache storage plus cleanup on delete and recycled id
safety. iOS has no equivalent: WidgetKit's `WidgetInfo` is identified by
kind, family, and configuration, so an iOS "instance" can only mean a
distinct configuration. Reconciling the two models, and the reload budget
cost of fetching per placement, is a later ADR that builds on #218's
configuration layer and supersedes the note above.

This ADR does not implement instances but fixes the six things that would
be expensive to change afterwards:

1. **Key type.** Every per-widget store is keyed by `WidgetScope`, never by
   a bare widget id. Today the only case is `.widget(id)`. Adding
   `.instance(id, key)` changes no caller.
2. **Resolver signature.** `resolve(scope)` and `revision(scope)` from day
   one. The instance layer slots in above `widget` in the fixed order.
3. **Unit of fetch.** Fetch, trial-render, commit, and coalescing are per
   scope. With widget scopes only, that is exactly the design above; with
   instance scopes it becomes per placement with no restructuring.
4. **Reserved names.** `instance` as a query parameter and `env.instance`
   are reserved and unused. Nothing else in the request or env changes when
   they arrive.
5. **Props slot.** The commit target stays the existing
   `DynamicWidgetPropsStore`, keyed like the settings store. #218 already
   reads per-instance configuration at render time through `appWidgetId`;
   per-instance props follow the same read path.
6. **Ordering.** Instance work lands after #218 (rebased over the package
   split from #262, which moved the files it edits) and after this ADR is
   implemented.

### Out of scope

- Token refresh. The app owns the token. Voltra stores and sends it.
- GET with a body. Neither platform stack can send it; a custom HTTP client
  is not worth it.

## Consequences

**Backward compatible.** Everything is additive:

- No config key changes shape. `serverUpdate` on a payload widget keeps its
  validation rules and its request. `url` becoming optional only widens what
  is accepted.
- Deprecated credential APIs keep their signatures and semantics as wrappers
  over the settings store, reading the same Keychain accounts and DataStore
  keys. They are removed in a later major.
- With no runtime layers set, payload fetchers send the identical request on
  the identical schedule.
- New Swift and Kotlin class names, storage keys, and work names for the
  Dynamic engine. Nothing pinned by WorkManager or Glance moves.
- Android credential store and crypto manager change package. No public API.
- Android generated receivers stop inlining URL and interval; the values
  move to a generated asset. Receivers are regenerated by `voltra apply` and
  `expo prebuild`, as with every generator change.
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
with a "Dynamic Widgets" section (response contract, curl and PHP examples),
the runtime settings API, and the take-over pattern. Mark the credential
APIs deprecated there and in `api/`. Update `api/plugin-configuration.md`
on both sides, `dynamic-widgets.md`, and
`skills/voltra/references/plugin-schema.md`.
