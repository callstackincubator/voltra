# ADR 0013: Render failures in Dynamic Widgets

Status: Proposed

Narrows the scope of
[#318](https://github.com/callstackincubator/voltra/issues/318). The issue
stays the long-form analysis; this ADR is what the first implementation
commits to.

## Introduction

When a Dynamic Widget fails to render, Voltra swallows the failure. The bundle
load, the bundle evaluation, `render(props, env)` and the node parse each
collapse their error into a `null`, and the widget draws the build-time
placeholder instead. That hurts three groups of people, in this order:

1. **A developer in a dev build.** Metro answers `500`, or the component
   throws on its props, and the widget keeps showing plausible build-time
   content. Nothing on the screen says it is broken, and the only trace is a
   C++ log line without a stack.
2. **An end user in a release build.** A widget that rendered fine drops back
   to the build-time placeholder after one bad props update, locale change or
   resize.
3. **The app.** It never learns that a render failed.

This ADR fixes 1 and 2 with no new public API, and defers 3 to the Android
event channel ([#314](https://github.com/callstackincubator/voltra/issues/314)).

## Context

### What exists

Android, on `main` at 2.4.0:

| Stage    | Where                                                           | Today                                                                             |
| -------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Bundle   | `VoltraClientGlanceWidget.fetchDevBundle` / `loadBakedBundle`   | `null` on HTTP error, exception or missing asset; Metro's error body is discarded |
| Evaluate | `VoltraJSRenderer.evaluateBundle`, `nativeEvaluateBundle` (C++) | `false`; the JS message is only in a C++ `LOGE`, the stack is never read          |
| Render   | `VoltraJSRenderer.render`, `nativeRender` (C++)                 | `null` on a JS throw or a non-string return; same logging                         |
| Parse    | `DynamicWidgetRenderCoordinator.renderDynamicWidget`            | `null`, logged under `DynamicWidgetRenderCoordinator`                             |
| Shown    | `VoltraClientGlanceWidget.Content`                              | live node, else the prerendered placeholder, else a grey "Loading…"               |

iOS behaves the same way: `VoltraClientWidgetRuntime.swift` records an
`errorMessage` for bundle failures but never shows it, and a failed `render()`
falls through to the prerendered initial state.

### A session-lifetime bug retry depends on

`provideGlance` loads and evaluates the bundle once, and passes the result to
`provideContent` as a captured `bundleReady: Boolean`. Glance keeps a session
alive across `update()` calls and does not re-run `provideGlance` for it (the
mechanism behind #263). So if Metro was unreachable when a session started,
that placement shows the placeholder for the rest of the session, even after
Metro comes back and props change. Any retry has to make the bundle state
something the composition reads, not a value it captured.

### Platform facts

- `ApplicationInfo.FLAG_DEBUGGABLE` is already what `VoltraClientGlanceWidget`
  calls dev (`isDev`). This ADR uses the same test.
- `jsi::JSError` carries `getMessage()` and `getStack()`. Release widget
  bundles are minified, so stack frames are only useful in dev.
- Glance `ActionCallback` class names are written into the `RemoteViews` the
  launcher holds, so a callback's fully qualified name is a shipped contract
  (ADR 0000, `DynamicWidgetRefreshActionCallback`).

## Decision

One rule, with no configuration: **loud in dev, graceful in release.** That
matches what React Native developers already expect: the red error screen in
dev, error boundaries keeping the UI up in production.

### 1. Failures carry their reason

Internally, a render of one placement produces either a node or a failure:

```kotlin
internal sealed interface DynamicWidgetRenderOutcome {
    data class Success(val node: VoltraNode) : DynamicWidgetRenderOutcome
    data class Failure(val stage: Stage, val message: String, val stack: String?) : DynamicWidgetRenderOutcome
    enum class Stage { Bundle, Evaluate, Render, Parse }
}
```

- `DynamicWidgetRenderCoordinator.renderDynamicWidget` returns this instead of
  `VoltraNode?`.
- The JS message and stack cross JNI. On a `jsi::JSError` the native code
  throws a Kotlin exception carrying both, so the success path stays a plain
  `String` with no extra copy. The exception class name is part of the JNI
  contract and gets a keep rule and a `VoltraJSRendererJniNamesTest` case.
  A non-string return from `render()` is a `Render` failure whose message
  names the returned type.
- Bundle failures in dev name the host and the cause:
  `Metro unreachable at <host>: <exception message>`, or
  `Metro HTTP <code> for <url>: <error field of the JSON body, truncated to 512 chars>`.
  In release they name the missing asset path.
- These names are internal. They become public only through the event in
  [Later](#later), which is where they are frozen.

### 2. Bundle state the composition can see

The captured `bundleReady` boolean is replaced by a process-wide, in-memory
record per widget id: `Ready` or `Failed(failure)`. One loader owns the whole
step (fetch from Metro or read the baked asset, evaluate, build the failure
message) and always records its result, so the three callers (`provideGlance`,
retry and the server-update trial render) follow one rule. The record is keyed
by widget id, not by placement, so a load from any of them is the right state
for every placement. `Content` reads it on every composition. Nothing about it
is persisted: a new process loads the bundle again anyway.

### 3. What is shown

| Build   | Render succeeds | Render fails                                                                                       |
| ------- | --------------- | -------------------------------------------------------------------------------------------------- |
| Dev     | the node        | the **dev error view**, always, even when a last good render or placeholder exists                 |
| Release | the node        | the **last good render** of this placement and size, else the placeholder, else today's "Loading…" |

Dev error view, composed with plain Glance primitives (not through a
`VoltraNode`, so it cannot fail the way the content did):

```
Dynamic Widget "inbox" failed (render)
TypeError: Cannot read property 'map' of undefined
  at InboxWidget (widgets/android/inbox-widget.tsx:31:22)
  at …
Tap to retry
```

It shows the widget id, the stage, the message and up to 6 stack frames. It is
visibly an error (red-tinted surface) and is never shown in release. Release
builds get no error view at all in this iteration, so there is nothing to
style, localise or configure.

### 4. Retry (dev only)

Tapping the dev error view runs
`voltra.dynamicwidget.DynamicWidgetRetryActionCallback`. Its name is pinned
from the first release that ships it. It:

1. reloads the bundle from Metro and re-evaluates it,
2. updates the bundle record from section 2,
3. re-renders the tapped placement through the same props-revision update a
   server fetch uses. `Content` already reads the props revision and re-reads
   the bundle record on every composition, so no revision of its own is needed.
   The tapped placement is resolved with `GlanceAppWidgetManager.getAppWidgetId`.

The bundle lives in one process-wide runtime, so a retry refreshes it for every
placement of that widget id. Only the tapped placement re-renders right away;
the others pick up the new bundle on their next render. A tap while a retry for
the same widget id is still running does nothing. Retry does not refetch server
props; the server refresh button keeps doing that.

The fetch runs inline in the callback with the existing 5 s connect and 5 s
read timeouts. An unreachable host fails at connect time. This is dev-only
traffic to a local Metro.

### 5. Last good render (release)

- Glance composes `Content` once for every distinct size a placement reports
  (`SizeMode.Exact`: `OPTION_APPWIDGET_SIZES` on API 31 and later, the portrait
  and landscape sizes below that), and a widget can draw a different tree for
  each (`env.widgetFamily`). So the last good render is keyed by
  `(widgetId, appWidgetId, widgetFamily)`, not by placement. Keyed by placement
  alone, the compositions of one placement would overwrite each other's file,
  defeat the skip-unchanged check below with two fsynced writes per round, and
  make a size that fails draw whichever size was composed last.
- After every successful render and parse, the resolved node JSON is stored
  under that key. It is written in every build, so dev runs exercise the write
  path, but it is read only in release.
- Storage: one file per placement and size under `noBackupFilesDir`, named by
  widget id, `appWidgetId` and family, written with `AtomicFile`. A write is
  skipped when the output equals the last write for that file (an in-memory
  hash), because recompositions mostly produce the same tree. A node over
  256 KB is not stored and does not evict the older one. A size a placement
  stops reporting leaves its file until the placement is deleted.
- Cleanup, one call per lifecycle callback through a single per-placement
  helper (`DynamicWidgetPlacementData`) that also cleans the instance
  configuration: `onDeleted` removes every size of the placement's files;
  `onRestored` moves them to the new id; `clearAndroidWidget` and
  `clearAllAndroidWidgets` remove the files for the widget id(s) they clear, so
  content the app cleared is not resurrected by a later failure.
- A placement whose `appWidgetId` cannot be resolved has no last good render.
- A size with no stored render of its own falls back to the placeholder. It
  never shows another size's layout.

### 6. Logging

Each failed render logs one `Log.e` under the tag `VoltraDynamicWidget`:

```
render failed widgetId=inbox appWidgetId=42 family=180x110 stage=render dev=true: TypeError: Cannot read property 'map' of undefined
```

In dev the JS stack follows in the same log call. Existing tags keep their
current lines. A successful render after a failure of the same placement and
size logs one `Log.i`:
`render recovered widgetId=<id> appWidgetId=<n> family=<family>`. Failure
tracking is per `(widgetId, appWidgetId, family)` for the same reason as the
last good render: a widget that fails at one size only would otherwise log a
failure and a recovery on every round of compositions.

## Scope

### In this change (Android)

- Sections 1 to 6.
- Tests: Robolectric/JUnit in
  `packages/android-client/android/src/test/java/voltra/dynamicwidget/`.
  - Coordinator: each stage maps to its outcome.
  - Bundle record.
  - Last-good store: write, skip-unchanged, size cap, delete, remap, clear,
    and two sizes of one placement.
  - Shown-content policy: dev vs release × last good / placeholder /
    nothing.
  - Retry: concurrent tap is a no-op.
  - JNI names.
- Device check on the example app:
  - Dev build: break the widget entry, stop Metro, see the error view; fix it
    or restart Metro, tap, see recovery.
  - Release build: push props that make `render()` throw, see the last good
    render stay up.
- Docs: a "When a render fails" section in
  `website/src/content/docs/android/development/dynamic-widgets.md` covering the
  policy, the dev error view, retry and the log line.
- A Changeset for `@use-voltra/android-client`. It changes visible behaviour:
  an error view in dev, and the last good render instead of the placeholder in
  release.

### iOS

The same policy on iOS: carry the JavaScriptCore error message and stack, a
dev error view, the last good render in the App Group, and a retry intent where
the platform allows one. Same log shape through `VoltraLogger`. Where iOS
differs:

- **Failure model.** The bundle load and evaluate stages fail in the timeline
  provider and are carried on the `TimelineEntry`; the render and parse stages
  fail in the View body, which WidgetKit may run in a fresh extension process.
  The renderer returns a typed result, and the JSC exception's `stack` is read
  from the thrown value.
- **Dev is `#if DEBUG`** in the widget extension, the same test the bundle
  loader already uses. Release bundles are the ones baked in by the
  "Bundle Voltra Dynamic Content" build phase.
- **Last good key.** iOS gives a placement no id of its own, so the key is
  `(widgetId, instance key, family)`, where the instance key is the hash of the
  placement's merged configuration (ADR 0007), absent for a widget with none.
  That is the nearest thing to Android's `(widgetId, appWidgetId, widgetFamily)`:
  without it two differently configured placements would show each other's
  content. One file per key under a `VoltraDynamicWidgetLastGood` directory in
  the App Group, 256 KB cap, skipped when unchanged.
- **Cleanup.** `clearWidget`, `clearAllWidgets` and the app's orphan cleanup
  (which compares against the installed kinds at launch) remove every
  instance's and family's files for the widget ids they cover. A file for an
  instance whose configuration changed stays until then, as a size a placement
  stops reporting does on Android; the cap bounds it.
- **Retry** is an App Intent button, so it needs iOS 17. The extension's default
  deployment target is 17.0; below it the error view has no button. It reloads
  the widget's timeline, which re-fetches and re-evaluates the bundle in dev.
  The intent is generated into the extension target by the config plugin and
  handed to the content view as a closure: an intent defined in a CocoaPods
  library is not in the extension's App Intents metadata, and a button made from
  one does nothing when tapped. Lock Screen (accessory) families get a reduced
  error view without it.
- **Log.** `[DynamicWidget] render failed widgetId=<id> family=<family> stage=<stage> dev=<bool>: <message>`
  on the `widget` category, with no `appWidgetId`; recovery is tracked per
  `(widgetId, family)`.

### Later

- **`dynamicWidgetRenderFailed` event** on both platforms, once #314 lands the
  Android event channel. Modelled on iOS's existing
  `dynamicLiveActivityRenderFailed`, with a deliberately small payload:
  `source`, `timestamp`, `widgetId`, `stage`, `message`, plus `appWidgetId` on
  Android. Fields are added when someone needs them, because they cannot be
  removed.
- **Render time limit**, as its own issue: a runaway `render()` holds the
  process-wide runtime lock and blocks every Dynamic Widget.
  `IHermes::watchTimeLimit` is available in the Hermes React Native 0.83
  ships.
- **Composition failures** (`onCompositionError`). Glance's stock "Can't show
  content" box stays for now; it is the one failure the user already sees.

### Not doing

- `errorView` plugin configuration (title, message, locales, `retry`).
  Release users almost never see an error view under this policy, so it does
  not earn public API.
- A JSX error-fallback export. If customisation is ever needed, an
  error-boundary-style export fits React developers better than plugin
  config, but it would cover only render failures.
- Throwing on unknown element types. That would turn a newer component on an
  older native client into a whole-widget failure.
- Posting failures to Metro, a persisted failure record, and a deduplicated
  failure queue. Logcat and the dev error view cover the developer; the event
  covers the app.

## Consequences

- A developer whose widget is broken sees it on the home screen, with the
  reason, and can recover with a tap after fixing the code or restarting
  Metro.
- A release widget that rendered once does not regress to build-time content
  because of a later failure. The cost is one small atomic file write per
  changed render and per placement.
- A release widget can show stale content without saying so. That is the
  intended trade: stale real content beats build-time content, and the app
  will be told through the event once it exists.
- No public API changes, so nothing here constrains the event design in #314.
