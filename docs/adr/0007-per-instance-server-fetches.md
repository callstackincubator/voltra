# ADR 0007: Per-instance server fetches for Dynamic Widgets

Status: Accepted

Implemented by [#286](https://github.com/callstackincubator/voltra/pull/286).

Builds on [ADR 0002](0002-server-driven-dynamic-widgets.md) and
[ADR 0006](0006-android-widget-instance-configuration.md). Supersedes the
"Instance-ready" note in ADR 0002. Tracks
[#206](https://github.com/callstackincubator/voltra/issues/206).

## Introduction

A server-driven Dynamic Widget fetches one JSON object per widget id and every
placement renders it. ADR 0006 lets each Android placement, and the iOS Edit
Widget sheet each iOS placement, hold its own `env.configuration`, but the
fetch does not know about it: the request carries no configuration, and the
props slot is shared by every placement. A weather widget configured for
London and another for New York fetch the same URL and show the same city.

This ADR sends the merged configuration to the endpoint, keys the fetch and
its props by that configuration, and schedules one fetch per distinct
configuration. Without the configuration on the wire the rest would be
pointless, so the request contract is the centre of the decision.

```
placement → merged configuration → instance key → fetch → props for that key → render
```

## Context

### What ADR 0002 prepared

Every server-driven store is keyed by a `WidgetScope` on both platforms: the
widget settings layer, the ETag store, the status store, WorkManager unique
work names on Android, timeline fetch coalescing on iOS, and the runner. The
type has one case, `Widget`, and both platforms document that an `Instance`
case slots in above it without touching callers. The query key `instance`
and the env field `env.instance` are reserved and unused.

### What is not instance-ready

- The Dynamic Widget props store on both platforms is keyed by the bare
  widget id, and the render reads props by widget id.
- Android schedules one periodic job per widget id whose input carries only
  the id; a committed fetch re-renders every placement.
- iOS coalesces timeline requests per widget id in a three second window, so
  the first placement's fetch serves all of them.
- The request builder sends `widgetId`, `platform`, `theme` and `locale`
  only. A server cannot tell placements apart.
- The trial render uses type-level configuration.

### What ADR 0006 provides

Android resolves the placement's `appWidgetId` in `provideGlance` and the
composable knows its merged configuration. iOS timeline providers already
receive the placement's configuration from WidgetKit.

### Instance identity differs by platform

Android has a placement id. iOS has none: WidgetKit identifies a placed widget
by kind, family and configuration, and two placements with the same
configuration are indistinguishable. Any cross-platform notion of an
instance therefore has to be derived from the configuration.

## Decision

### An instance is a distinct merged configuration

The instance key is a stable hash of the merged configuration a placement
renders with: defaults, overlaid with widget-type values, overlaid with the
placement's own values. Two placements with identical configuration share
one key, one fetch, one ETag and one props slot. A placement whose
configuration changes moves to another key.

This is the only identity iOS can have, and on Android a per-placement fetch
would buy nothing: two placements with the same configuration can only want
the same data. It also bounds the fetch count by distinct configurations
rather than placements.

The key is computed from the canonical serialization defined below with a
short, stable, non-cryptographic hash. Both platforms produce the same key
for the same configuration, and the key is opaque to the server.

A widget with no configuration parameters has exactly one instance, the
widget scope, and its requests and storage are unchanged by this ADR.

### Request contract

The configuration travels on the query as one JSON argument:

```
GET https://api.example.com/widgets/weather
    ?widgetId=weather&platform=android&theme=dark&locale=en-US
    &instance=3f9a2c1e
    &configuration=%7B%22city%22%3A%22London%22%2C%22units%22%3A%22metric%22%7D
```

- `configuration` is the merged map, serialized canonically: keys sorted
  by code point, no whitespace, values as JSON strings. Decoded, it is byte
  for byte what the widget sees as `env.configuration`, so server and widget
  agree by construction.
- `instance` is the hash of that canonical string, sent so a backend can
  cache or log per instance without recomputing it.
- Both are absent when the widget has no configuration parameters, so an
  existing server-driven widget sees no change in its requests.
- Both stay on the query for every method. The app-supplied body is
  untouched, so an existing body contract keeps working.
- JSON rather than flat `config.<name>` parameters: one value, one parse,
  and it carries a later typed parameter as it is instead of flattening it
  to a string. `configuration` joins `instance` in the reserved query keys
  the settings validator rejects.
- The query, not a header: CDN cache keys ignore custom headers by default,
  and a cache in front of the API would then serve London's data to the
  New York placement. On the query every layer of caching sees the
  difference.
- Canonical serialization keeps the URL stable for the same configuration,
  which the URL-keyed ETag store and any HTTP cache depend on.

Configurations are meant for identifiers and short choices. Percent-encoding
roughly triples braces and quotes, and the docs say so; a URL stays well
within common limits for a handful of short strings.

### `WidgetScope.Instance`

Both platforms add `Instance(widgetId, key)` to `WidgetScope`. Its
`storageKey` is `<widgetId>#<key>`, so every widget-scoped record written
today keeps its key. `widgetId` reports the id it is an instance of.

The settings resolver, ETag store, status store, runner and request builder
take the new case with no signature change. The settings layers keep
resolving by widget id: an instance inherits the widget's URL, interval,
method, headers and body, and no instance settings layer is added until a
need is shown.

### Props per instance, with fallback

The Dynamic Widget props store gains an instance slot keyed by the scope's
storage key. A fetch commits into the instance slot. The render reads the
instance slot for the placement's key and falls back to the widget slot when
it is empty, so `updateAndroidDynamicWidget` and its iOS twin keep working as
the app's type-level override, and a placement that has not fetched yet
shows whatever the app last wrote rather than `{}`.

Clearing a widget's props clears every instance slot of that widget. Logout,
which clears the server props of every server-driven widget, clears instance
slots too; the store keeps an index of instance keys per widget so this needs
no enumeration of placements.

### Scheduling per instance

**Android.** The scheduler works per scope, as it does today, but the set of
scopes for a widget is derived from its placements: enumerate the widget's
`appWidgetId`s, compute each one's merged configuration and key, and take the
distinct keys. That set is recomputed, and periodic work scheduled for new
keys and cancelled for keys with no placement left, on every event that can
change it: `onUpdate`, `onDeleted`, an instance write or clear, and a
type-level write. Worker input data carries the widget id and the key. A
committed fetch re-renders only the placements whose key matches.

**iOS.** The timeline provider derives the key from the configuration
WidgetKit hands it and uses the instance scope for coalescing, ETag, props
and status. WidgetKit already calls the timeline once per placement and
family, so per-instance scheduling needs no new mechanism; the coalescing
window collapses the family calls of one placement, and placements with the
same configuration, into one fetch.

### Trial render and status

The trial render uses the instance's configuration, so a server response is
judged against the environment it will actually be drawn in.
`env.serverUpdate` for a placement comes from its instance's status record.
`env.instance` carries the key on both platforms, and is `undefined` on a
widget with no configuration parameters, keeping ADR 0002's reservation.

### JavaScript API

Nothing changes. There is no instance to name from the app: the app writes
configuration through ADR 0006's API, and fetches follow. `reloadWidgets`,
`setWidgetServerUpdate` and `getWidgetServerUpdate` keep their widget-id
scope; a reload or a settings change affects every instance of the widget.

### Documentation and example

- The server-driven pages on both platforms document `instance` and
  `configuration`, the canonical encoding, the fallback rule, and that
  identical configurations share a fetch.
- The example server in `example/server/widget-server.tsx` reads
  `configuration` and answers differently per value, so the example app
  demonstrates the feature end to end with two placements.
- ADR 0002's "Instance-ready" section is marked superseded by this ADR.

### Verification

- Unit tests on both platforms for the canonical serialization and key: key
  order independence, identical output for identical maps, a changed value
  changing the key, and no `instance` or `configuration` for an empty map.
- Request builder tests asserting the two parameters, their absence for an
  unconfigured widget, and the reserved-key rejection.
- Props store tests for the instance slot, the fallback to the widget slot,
  and clearing by widget.
- Android scheduler tests for the derived scope set: new keys scheduled,
  orphaned keys cancelled, placements with equal configuration sharing a
  job.
- Runner tests unchanged in shape, run against an instance scope.
- Emulator and simulator runs with two placements of the example widget
  configured differently, a server returning different data per
  configuration, and the two widgets showing different data.

## Consequences

- A server-driven Dynamic Widget can show per-placement data on both
  platforms, from the same endpoint, with a request any backend can read.
- Fetch count becomes the number of distinct configurations per widget. A
  free-text parameter with ten placements means ten fetches per interval,
  bounded by the 15 minute floor; the docs say this plainly, and a server
  can stretch the interval with `Cache-Control: max-age` as it can today.
- Widgets without configuration parameters are unaffected: same request,
  same storage, same schedule.
- The type-level props slot remains the app's override and the fallback, so
  existing apps that push props keep their behaviour.
- Per-instance settings, such as a different URL per placement, are not
  provided. The resolver's layer list can take an instance layer later
  without changing callers.
