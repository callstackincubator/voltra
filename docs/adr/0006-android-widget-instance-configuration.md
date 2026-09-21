# ADR 0006: Per-instance configuration for Android Dynamic Widgets

Status: Accepted

Implemented by [#285](https://github.com/callstackincubator/voltra/pull/285).

Resolves [#206](https://github.com/callstackincubator/voltra/issues/206).
Supersedes the design of PR
[#218](https://github.com/callstackincubator/voltra/pull/218), which predates
ADR 0000 and ADR 0002.

## Introduction

Android gives every placed app widget its own `appWidgetId`. Voltra's Android
configuration store is keyed by the Voltra widget id alone, so two placements
of the same Dynamic Widget always see the same `env.configuration`. A user who
places the weather widget twice cannot have one show London and the other
New York, which is the usual reason to place a widget twice.

This ADR adds an instance layer to that store, keyed by `appWidgetId`, with a
small app-facing API to write, read and clear it, and cleanup when a widget
leaves the home screen. It changes nothing about how a Dynamic Widget is
written: the entry still reads `env.configuration`, and now gets the values of
the placement being rendered.

```
defaults (app.json)  <  widget-type values  <  instance values  →  env.configuration
```

## Context

### What exists

- `VoltraConfigurationStore` (`voltra.dynamicwidget`) is a Preferences
  DataStore with two layers merged at read time: defaults emitted by the
  config plugin and the CLI to `assets/voltra/widget_config_defaults.json`
  from `appIntent.parameters[].default`, and values written at runtime under
  `voltra.config.<widgetId>.<key>`. `VoltraClientGlanceWidget.provideGlance`
  reads it with the widget id only and puts the map on `env.configuration`.
  `renderDynamicWidgetForTrial` reads it the same way.
- `setWidgetConfiguration(widgetId, key, value)` is the only write path. The
  native module resolves the widget's kind through `VoltraWidgetKindResolver`
  before writing (ADR 0000) and rejects payload-driven widgets with
  `VOLTRA_WIDGET_KIND_MISMATCH`.
- `getActiveWidgets()` lists placements. Its `widgetId` field is the Android
  `appWidgetId` and its `name` field is the Voltra widget id, which is the
  wrong way round from every other API in the package.
- Receivers form a hierarchy: `VoltraWidgetReceiver` is the shared base,
  `VoltraClientWidgetReceiver` hosts Dynamic Widgets, and
  `VoltraServerDrivenClientWidgetReceiver` extends it for widgets with a
  `serverUpdate`. ADR 0000 forbids the base package from importing the Dynamic
  package. `GlanceAppWidgetReceiver.onReceive` consumes `goAsync()`, so a
  receiver override cannot call it again.
- Glance 1.2 provides both directions of the instance mapping:
  `GlanceAppWidgetManager.getAppWidgetId(glanceId)` and
  `getGlanceIdBy(appWidgetId)`. `VoltraWidgetReceiver.triggerGlanceUpdate`
  has an overload that re-renders one `GlanceId`.
- `VoltraWidgetReceivers` maps widget ids to receiver components by reading
  the manifest, so it is correct when `applicationId` and `namespace` differ.
  `widgetIdOrNull(className)` parses the id out of a generated class name.
- ADR 0002 keys everything server-driven by `WidgetScope`, whose only case is
  a whole widget id. It reserves the `instance` query parameter and
  `env.instance`, and states that per-instance fetches are a later ADR that
  lands after this feature.

### What iOS does

WidgetKit has no placement id. `WidgetCenter.getCurrentConfigurations`
identifies a placed widget by kind, family and its intent configuration, and
the app cannot write configuration into one placement. iOS Dynamic Widgets
already render per placement: the CLI generates a `WidgetConfigurationIntent`
from `appIntent.parameters`, the user edits values in the system Edit Widget
sheet, and the timeline provider passes that placement's values to
`env.configuration`. This ADR gives Android the same outcome by a different
writer: the app instead of the system sheet.

### Why PR #218 does not land as is

It was written before the package split and the server-driven engine. It
checks the widget kind through the Glance registry (`getWidget(...) is
VoltraClientGlanceWidget`), which registers the widget as a side effect and is
the check ADR 0000 replaced with the resolver. It parses receiver class names
with a package-name prefix that #259 showed is wrong. It overrides `onDeleted`
in the base receiver, importing the Dynamic package, and calls `goAsync()`
there, which Glance has already consumed. It renames the type-level key prefix
and ships a one-time migration to avoid a widget id colliding with the word
`instance`. Its store logic, JS surface and tests are otherwise the right
shape and are carried over.

## Decision

### Scope

- Dynamic Widgets only, including server-driven ones: they are the only
  widgets that read `env.configuration`. Writes for a payload-driven widget
  are rejected before anything is stored.
- Android only. No cross-platform type changes beyond the Android
  `WidgetInfo`.
- The launcher-side flow (`android:configure`, a trampoline Activity,
  `widgetFeatures`) is not part of this ADR. It changes placement semantics
  for every widget that declares parameters and deserves its own decision.
- Per-instance server fetches are not part of this ADR. The server request is
  unchanged, and `instance` and `env.instance` stay reserved as ADR 0002
  says.

### Three layers, one precedence

`VoltraConfigurationStore.get(widgetId, appWidgetId)` returns, for one
placement, the defaults overlaid with the widget-type values overlaid with the
instance values. A key present in a more specific layer hides the same key in
a less specific one. `get(widgetId)` without an instance returns defaults plus
widget-type values and is what the trial render and the type-level getter use.

Storage keys:

- Widget-type values keep their current `voltra.config.<widgetId>.<key>`
  layout. Nothing existing is rewritten and no migration runs.
- Instance values are stored as `voltra.instance.<widgetId>.<appWidgetId>.<key>`
  in the same DataStore.

The instance prefix carries the widget id so that an `appWidgetId` the
launcher recycles across widget types cannot leak values even when `onDeleted`
never fired for the old placement. The two prefixes cannot overlap: a widget
id is part of a generated Kotlin class name and therefore contains no dot, and
every prefix scan ends with a dot, so `voltra.instance.x.4.` never matches a
key written for instance `42`.

Values are strings, as today. The type-level setter is unchanged and remains
the "every placement" default that instance values shadow. Setting a
type-level key does not visibly change a placement that has its own value for
that key, and the documentation says so.

### Reading at render time

`provideGlance` resolves the placement with
`GlanceAppWidgetManager.getAppWidgetId(id)` and passes it to the store. If the
call throws, the widget logs a warning and renders with the type-level values,
so a Glance edge case degrades to today's behaviour rather than to a blank
widget.

The configuration the composition renders with is keyed on a Glance state
revision, alongside the props revision ADR 0002 added.
`GlanceAppWidget.update` on a widget whose Glance session is still alive only
reloads Glance state and recomposes; it does not re-run `provideGlance`. A
value read in `provideGlance` and captured by the `provideContent` lambda is
therefore frozen for the life of that session, so a write stayed invisible
until the session idled out. Every configuration write advances that
placement's revision before asking Glance to update, and the composition
re-reads the store whenever it changes. `provideGlance`'s read remains the
value the first composition of a session uses, so first paint costs no
blocking read.

`renderDynamicWidgetForTrial` keeps reading type-level values. It renders once
per widget id to decide whether fetched props render at all, and ADR 0002
already fixes it at that granularity.

### Resolving an instance

One place, in the Dynamic package, turns an `appWidgetId` into a validated
Voltra widget id. In order:

1. `AppWidgetManager.getAppWidgetInfo(appWidgetId)`. Null means the id is not
   a placed widget: reject with `VOLTRA_WIDGET_INSTANCE_NOT_FOUND`.
2. The provider must be one of `VoltraWidgetReceivers.installedReceivers`.
   Otherwise the instance belongs to another app or to a non-Voltra provider:
   reject with `VOLTRA_WIDGET_INSTANCE_NOT_FOUND`. The message says why.
3. The widget id comes from that map, not from parsing the class name against
   the package name.
4. `VoltraWidgetKindResolver.resolve` must return `Dynamic`. A payload-driven
   kind rejects with `VOLTRA_WIDGET_KIND_MISMATCH`; an unresolved kind with
   `VOLTRA_WIDGET_NOT_FOUND`, the same codes the other Dynamic APIs use.

Nothing is written before step 4 passes (ADR 0000). The resolver takes its
Android collaborators through a small boundary interface, in the style of
`DynamicWidgetUpdater`, so the rejection table is unit-tested without a
device.

### Native module

Four methods on `NativeVoltraAndroid`, all returning promises:

| Method                                              | Does                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `setWidgetInstanceConfiguration(appWidgetId, json)` | Resolve, write every key of the JSON object in one DataStore edit, re-render that placement |
| `getWidgetInstanceConfiguration(appWidgetId)`       | Resolve, return the merged three-layer map as JSON                                          |
| `getWidgetConfiguration(widgetId)`                  | Kind check, return defaults plus widget-type values as JSON                                 |
| `clearWidgetInstanceConfiguration(appWidgetId)`     | Resolve, remove every instance key of that placement, re-render that placement              |

`appWidgetId` crosses the bridge as a number and is truncated to `Int`. Values
cross as a JSON object so several keys cost one bridge call, one DataStore
transaction and one re-render. The re-render uses the single-`GlanceId`
overload of `triggerGlanceUpdate`, so sibling placements are not redrawn. A
failed re-render is logged and does not reject the promise: the value is
persisted and the next render picks it up, which is also what happens when the
app writes while the launcher is not showing the widget. A failed write
rejects with `VOLTRA_WIDGET_CONFIG_ERROR`.

`getActiveWidgets` adds `appWidgetId` (the Android instance id) and
`widgetType` (the Voltra widget id) to every entry. `widgetId` and `name` stay
with their current values and are documented as deprecated aliases.

`clearAndroidWidget` and `clearAllAndroidWidgets` keep clearing props only.
Configuration is what the user asked the widget to show, not data the app
pushed, and it survives a props reset exactly as the type-level values do
today.

### JavaScript API

In `@use-voltra/android-client`:

```ts
setWidgetInstanceConfiguration(appWidgetId: number, key: string, value: string): Promise<void>
setWidgetInstanceConfiguration(appWidgetId: number, values: Record<string, string>): Promise<void>
getWidgetInstanceConfiguration(appWidgetId: number): Promise<Record<string, string>>
getWidgetConfiguration(widgetId: string): Promise<Record<string, string>>
clearWidgetInstanceConfiguration(appWidgetId: number): Promise<void>
```

The setter validates on the JS side that every value is a string and throws a
plain `Error` before crossing the bridge. `setWidgetConfiguration` is
unchanged. `WidgetInfo` in `@use-voltra/android` gains `appWidgetId: number`
and `widgetType: string`, with `widgetId` and `name` marked `@deprecated`.

### Cleanup on delete

`VoltraClientWidgetReceiver` overrides `onDeleted` and removes the instance
keys of every deleted id for its widget id. The DataStore edit runs inside
`runBlocking`, the pattern `VoltraServerDrivenClientWidgetReceiver.onUpdate`
already uses for the same reason: `goAsync()` is not available, and launching
a coroutine risks the process being reclaimed before it runs. Failures are
logged, never thrown; the widget-id-qualified key bounds what a missed cleanup
can leak. `VoltraServerDrivenClientWidgetReceiver.onDeleted` already calls
`super.onDeleted`, so it inherits the cleanup.

### Encapsulation

All Kotlin changes stay in `packages/android-client/android/src/main/java/voltra`:

- `dynamicwidget/VoltraConfigurationStore.kt` gains the instance layer:
  `get(widgetId, appWidgetId)`, `setInstanceValues`, `clearInstance`.
- `dynamicwidget/VoltraClientGlanceWidget.kt` resolves the `appWidgetId` in
  `provideGlance`.
- `dynamicwidget/VoltraClientWidgetReceiver.kt` gains `onDeleted`.
- A new file in `dynamicwidget/` holds the instance resolver and its boundary.
- `VoltraModule.kt` gains the four methods and the two `getActiveWidgets`
  fields, delegating to the above.

`voltra.widget` and `voltra.widget.payload` are not touched. The config plugin
and the CLI are not touched: the defaults asset already exists and the
provider XML does not change.

### Documentation, example and version plan

- `website/docs/v2/android/development/dynamic-widgets.md` gets a section on
  configuring each placed instance, showing the three layers, the API, the
  shadowing rule for type-level writes, and that removing a widget drops its
  values. It states that the launcher-side edit flow is not available yet and
  that iOS has the equivalent through the system sheet.
- `website/docs/v2/android/development/querying-active-widgets.md` documents
  the two new `WidgetInfo` fields and marks the old two as deprecated.
- The example app gets an Android screen that lists placements from
  `getActiveWidgets`, edits a placement's label, writes it with the object
  form, and clears it.
- A version plan records a minor bump for `@use-voltra/android-client` and
  `@use-voltra/android`.

### Verification

- Robolectric tests for the store: precedence across the three layers,
  isolation between two instances of one widget and between two widgets
  sharing an `appWidgetId`, `clearInstance` leaving type-level values alone,
  and a type-level scan never matching an instance key.
- Robolectric tests for the resolver: unknown id, provider of another
  package, payload-driven kind, unresolved kind, and the happy path, using the
  existing test receiver classes.
- A receiver test that `onDeleted` removes the deleted ids' values and leaves
  a surviving placement's values.
- A JS test for the setter overload and its string validation.
- An emulator run with two placements of the demo Dynamic Widget: different
  labels per placement, a type-level write changing only the unconfigured
  placement, a clear falling back to the type-level value, and removing and
  re-adding a widget not inheriting the old values.

## Consequences

- Two placements of the same Android Dynamic Widget can show different
  user-chosen values, written from the app's own settings screen. The entry
  component does not change; the same widget code already behaves this way on
  iOS.
- Existing type-level configuration and stored values keep working with no
  migration. Apps that never call the instance API see no behaviour change.
- The instance layer is Android-only. The cross-platform contract for widget
  authors stays "read `env.configuration`"; the docs explain who writes it on
  each platform.
- A placement's values are lost when the launcher restores a backup and
  reassigns ids; the widget then shows type-level or default values. This is
  documented and left for a later change. _Update: handled by `onRestored` in
  the Dynamic receiver, which moves each placement's values to its new id
  (#287 stack, third PR)._
- The launcher's own edit gesture does nothing until the follow-up that wires
  `android:configure`. Until then the app is the only place to change a
  placement's values.
- ADR 0002's instance work can build on this store: the key already carries
  both the widget id and the placement, which is the shape a `WidgetScope`
  instance case needs.
