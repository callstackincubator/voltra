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
record per widget id: `Ready` or `Failed(failure)`. `provideGlance` writes it
when it loads the bundle, and `Content` reads it on every composition. Nothing
about it is persisted: a new process loads the bundle again anyway.

### 3. What is shown

| Build   | Render succeeds | Render fails                                                                              |
| ------- | --------------- | ----------------------------------------------------------------------------------------- |
| Dev     | the node        | the **dev error view**, always, even when a last good render or placeholder exists        |
| Release | the node        | the **last good render** of this placement, else the placeholder, else today's "Loading…" |

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
3. advances a Glance state revision for the tapped placement that `Content`
   observes, and calls `update()` for that `GlanceId`.

The bundle lives in one process-wide runtime, so a retry refreshes it for every
placement of that widget id. Only the tapped placement re-renders right away;
the others pick up the new bundle on their next render. A tap while a retry for
the same widget id is still running does nothing. Retry does not refetch server
props; the server refresh button keeps doing that.

The fetch runs inline in the callback with the existing 5 s connect and 5 s
read timeouts. An unreachable host fails at connect time. This is dev-only
traffic to a local Metro.

### 5. Last good render (release)

- After every successful render and parse, the resolved node JSON is stored
  per placement, keyed by `(widgetId, appWidgetId)`. It is written in every
  build, so dev runs exercise the write path, but it is read only in release.
- Storage: one file per placement under `noBackupFilesDir`, written with
  `AtomicFile`. A write is skipped when the output equals the last write for
  that placement (an in-memory hash), because recompositions mostly produce
  the same tree. A node over 256 KB is not stored and does not evict the older
  one.
- Cleanup: `onDeleted` removes the placement's file; `onRestored` moves it to
  the new id, alongside `remapInstanceConfiguration`; `clearAndroidWidget` and
  `clearAllAndroidWidgets` remove the files for the widget id(s) they clear, so
  content the app cleared is not resurrected by a later failure.
- A placement whose `appWidgetId` cannot be resolved has no last good render.
- Accepted limitation: the stored node is the one rendered for the size at
  the time. After a resize whose render fails, the widget shows the previous
  size's layout until a render succeeds.

### 6. Logging

Each failure logs one `Log.e` under the tag `VoltraDynamicWidget`:

```
render failed widgetId=inbox appWidgetId=42 stage=render dev=true: TypeError: Cannot read property 'map' of undefined
```

In dev the JS stack follows in the same log call. Existing tags keep their
current lines. A successful render after a failure of the same placement logs
one `Log.i`: `render recovered widgetId=<id> appWidgetId=<n>`.

## Scope

### In this change (Android)

- Sections 1 to 6.
- Tests: Robolectric/JUnit in
  `packages/android-client/android/src/test/java/voltra/dynamicwidget/`.
  - Coordinator: each stage maps to its outcome.
  - Bundle record.
  - Last-good store: write, skip-unchanged, size cap, delete, remap, clear.
  - Shown-content policy: dev vs release × last good / placeholder /
    nothing.
  - Retry: revision advanced for the tapped placement only, concurrent tap
    is a no-op.
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

### Next PR (iOS)

The same policy on iOS: carry the JSC error message and stack, a dev error
view, the last good render per widget kind and family in the App Group, and a
retry intent where the platform allows one. Same log shape through
`VoltraLogger`.

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
