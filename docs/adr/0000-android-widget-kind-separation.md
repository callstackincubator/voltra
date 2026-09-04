# ADR 0000: Separate payload-driven and Dynamic Android widget paths

Status: Accepted — not yet implemented

## Introduction

Android home screen widgets in Voltra come in two kinds that share one id
space and one generated receiver naming convention:

- **Payload-driven widgets** (the original engine). The app renders JSX to a
  compressed multi-variant payload with `updateAndroidWidget`, the payload is
  persisted in SharedPreferences, and the widget draws it with
  `VoltraGlanceWidget` or a direct RemoteViews path. Optional server refresh
  (`serverUpdate`) fetches the same payload shape through a WorkManager
  worker and a Glance refresh action.
- **Dynamic Widgets** (`entry` in the widget config). The widget's JS module
  is bundled with the app, evaluated on-device in a Hermes runtime, and
  re-rendered on every Glance composition. The app sends only props with
  `updateAndroidDynamicWidget`; a prerendered single-node placeholder from
  `voltra_initial_states.json` covers first paint and offline.

Issue [#222](https://github.com/callstackincubator/voltra/issues/222) showed
what happens when the two are mixed: a Dynamic Widget updated through the
payload API stays on "Loading…" forever. The payload API wrote a full payload
into the SharedPreferences key that the Dynamic Widget's placeholder reader
consults first, and the single-node decoder rejected it. Nothing in the
native layer resolved the widget's kind before acting, and the wrong call
succeeded silently.

## Context

An import audit of `packages/android-client/android/src/main/java/voltra`
found the two paths coupled in both directions:

- `voltra.widget.VoltraWidgetReceiver`, the shared base receiver, imports
  `voltra.dynamicwidget` and hosts Dynamic-only validation and update helpers.
  Its default `GlanceAppWidget` factory and its resize handler are
  payload-specific; Dynamic receivers opt out only by overriding them.
- `voltra.dynamicwidget.DynamicWidgetGlanceUpdateCoordinator` imports the
  concrete `VoltraClientGlanceWidget` and the base receiver from
  `voltra.widget`.
- `VoltraClientGlanceWidget` reads its placeholder through the payload store.
- The receiver `ComponentName` convention
  (`<applicationId>.widget.VoltraWidget_<id>Receiver`) is rebuilt in at least
  eight places: the payload manager (twice), the receiver registry, the
  Dynamic update coordinator, the update worker, the refresh callback, the
  pin request, and active-widget discovery.
- `VoltraWidgetManager.updateWidgetViaGlance` and the pin-preview path in
  `VoltraModule` construct `VoltraGlanceWidget(widgetId)` without checking
  what kind of receiver the id is bound to.
- `voltra.glance.RemoteViewsGenerator` is used only by payload code and
  imports the payload refresh callback. `voltra.runtime` (`VoltraJSRenderer`,
  `VoltraConfigurationStore`) is used only by Dynamic code.
- Both update APIs persist before validating anything, so a wrong call
  leaves state behind even when it later fails.

Three vocabularies describe the same split: "client-rendered" in the CLI,
receiver, and Glance widget class names; "Dynamic Widget" in the docs, JS API,
and `dynamicwidget` package; "server-rendered", "payload-driven", or "legacy"
for the other side.

Two runtime facts constrain any restructuring:

- WorkManager persists the worker's fully qualified class name in its
  database and recreates it reflectively. Glance serializes an
  `ActionCallback`'s class name into the RemoteViews the launcher holds.
  Moving `VoltraWidgetUpdateWorker` or `VoltraRefreshActionCallback` breaks
  in-flight work and existing refresh buttons on already-installed widgets
  until the user re-adds them. A Kotlin `typealias` does not create the old
  JVM class and does not help.
- The native renderer exports JNI symbols named after the Kotlin package
  (`Java_voltra_runtime_VoltraJSRenderer_*`). Moving `VoltraJSRenderer`
  without renaming them produces `UnsatisfiedLinkError`, which the Kotlin side
  swallows into permanent placeholder rendering.

## Decision

### Kind is explicit and checked before any write

- Every receiver declares its kind through a base-owned contract
  (`VoltraWidgetKind`, with values `Payload` and `Dynamic`) rather than the
  native layer inferring it from concrete Glance widget classes. The base
  package does not import either kind-specific package to resolve a kind.
- A single resolver returns `Payload`, `Dynamic`, or an explicit
  `Unresolved` result. Reflection or lookup failure is reported as
  `Unresolved`, never as the other kind.
- `updateAndroidWidget`, `updateAndroidDynamicWidget`, and
  `setWidgetConfiguration` resolve the kind first and reject the promise on
  mismatch with an error that names the correct API. Nothing is persisted
  before the check passes. The same guard applies to the pin-preview path and
  to the update worker before it writes a fetched payload.
- The widget registry that backs resolution is thread-safe.

### Dynamic Widgets never read payload state

- The Dynamic placeholder is read by a Dynamic-owned reader that consults
  only `voltra_initial_states.json`. It keeps the existing
  `__voltraLocales` selection order (exact tag, language, `en`, `__default`,
  sorted first key). The payload SharedPreferences store is never consulted
  by Dynamic code.

### Package layout

Within `packages/android-client/android/src/main/java/voltra`:

- `voltra.widget` holds only what both kinds share: the `VoltraWidgetReceiver`
  base (registry and lifecycle), `VoltraWidgetKind`, the kind resolver, and
  one helper that builds a receiver `ComponentName` from a widget id. All
  receiver-name construction goes through that helper.
- `voltra.widget.payload` holds the payload engine: a payload-specific
  receiver superclass that owns the default `VoltraGlanceWidget` factory and
  the resize re-render, `VoltraGlanceWidget`, `VoltraWidgetManager`,
  `ResponsiveWidgetUpdate`, `RemoteViewsGenerator`, the update scheduler and
  request, the credential store, and the crypto manager.
- `voltra.dynamicwidget` holds the Dynamic engine: the existing coordinator,
  updater, props store, and Glance state, plus `VoltraClientGlanceWidget`,
  `VoltraClientWidgetReceiver`, `VoltraJSRenderer`,
  `VoltraConfigurationStore`, and the placeholder reader. The `voltra.runtime`
  package is removed and the JNI exports are renamed to match.
- `glance`, `parsing`, `models`, `styling`, and `images` stay shared and
  kind-agnostic.
- The dependency rule is: `voltra.widget.payload` and `voltra.dynamicwidget`
  may depend on `voltra.widget` and on the shared rendering packages; they
  never depend on each other; `voltra.widget` depends on neither. The rule is
  a convention for now. No build-time enforcement is added.

### Runtime entry points keep their class names

- `VoltraWidgetUpdateWorker` and `VoltraRefreshActionCallback` stay at
  `voltra.widget` as thin classes that delegate into `voltra.widget.payload`.
  Each carries a comment explaining that WorkManager and Glance persist the
  class name on the device, so the name is part of the installed contract.

### Orchestration

- `VoltraModule` remains the single Turbo Module and is the only place that
  legitimately touches both kinds. Cross-kind operations (clear all, reload
  all, colour-scheme re-render) live there or in a small coordinator it owns,
  and classify each installed provider through the resolver instead of
  inferring Dynamic ids by subtraction. The payload manager is payload-only.

### Generated code and compatibility

- The CLI and Expo receiver templates emit the new fully qualified names.
  Generated receivers are rewritten by `voltra apply` and `expo prebuild`;
  no compatibility aliases are provided for the old class paths of
  `VoltraWidgetReceiver` subclasses or moved payload classes. The change is
  recorded as a breaking change for `@use-voltra/android-client` in its
  changeset.
- Generator tests assert the complete import and superclass lines, not
  substring presence.

## Consequences

- A widget id can no longer be driven through the wrong API by accident. The
  failure is an immediate rejected promise with an actionable message instead
  of a silent "Loading…".
- A Dynamic Widget cannot be poisoned by payload state, including state
  written by an app version predating this change.
- Reviewers can tell which engine a file belongs to from its package, and a
  cross-kind import is visible in the diff.
- Consumers who hand-edited generated receivers must regenerate them. The
  Kotlin classes are public, but no supported integration imports them
  directly.
- Two runtime entry-point classes stay outside the package they logically
  belong to. The comment in each explains why.
- Known pre-existing gaps that this decision does not cover and that should
  be tracked separately: receiver resolution assumes the Gradle `namespace`
  equals the runtime `applicationId`; changing a widget id's kind between
  releases does not cancel WorkManager jobs scheduled by the old kind.
