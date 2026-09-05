# ADR 0002: Bitmap-rendered arc progress indicator for Android widgets

Status: Accepted

Implemented by #268.

Resolves [#204](https://github.com/callstackincubator/voltra/issues/204).

## Introduction

Issue #204 asks for an arc progress indicator on Android: a partial ring
whose stroke fills clockwise with a value, with a gap at the bottom, rounded
ends, and a label or icon in the middle. It is the "battery 75 %" and the
Fitbit-style "four gauges in a row" pattern, and it is the most requested
visual that Voltra's Android widgets cannot express today.

Voltra renders Android widgets with Jetpack Glance, which translates a
composition into `RemoteViews` for the launcher. Glance's
`CircularProgressIndicator` is indeterminate only: the composable takes no
progress value and its translator hardcodes
`setProgressBar(id, 0, 0, true)`. Glance has no canvas. The official
component list is `Box`, `Column`, `Row`, `Text`, `Image`, `LazyColumn`,
buttons and compound buttons, so there is no primitive that draws a partial
arc on any Android version.

## Context

The options were evaluated against the AOSP and AndroidX sources, not the
documentation alone. Three routes exist:

1. **A `Bitmap` drawn with `Canvas.drawArc` and delivered through a Glance
   `Image`.** Works on every API level the client supports (24+). Supports
   round caps, arbitrary stroke width, start angle, sweep, and gradients. It
   is the same mechanism as the existing `Chart` component, which draws a
   bitmap but hands it to Glance as an `Icon`. Its cost is
   bitmap memory: the framework caps the bitmap bytes of one widget instance
   at 1.5 times the screen in ARGB, computed once from the real display size
   in `AppWidgetServiceImpl` (`6 * width * height` bytes, about 15.5 MB on a
   1080 × 2400 phone). Exceeding it makes `updateAppWidget` throw and Glance
   shows its error layout. Only `Bitmap`-typed `RemoteViews` actions are
   counted and deduplicated by `RemoteViews.BitmapCache`; `Icon`-typed images
   are neither. Bitmap pixels do not consume the 1 MB binder transaction
   buffer, because bitmaps above a small in-place threshold are parcelled
   through ashmem.
2. **A `ProgressBar` with a ring `progressDrawable`, embedded through
   `AndroidRemoteViews`.** Costs no bitmap memory, but a ring path has no
   stroke caps (flat ends only), stroke width and gradients live in XML, and
   `View.setRotation` became remotable only on Android 12, so start angle is
   a runtime property only from API 31.
3. **RemoteCompose**, the binary drawing document behind
   `RemoteViews.DrawInstructions` (API 35), which has a native arc operation.
   Glance selects that backend only on SDK 36 and above, only in the 1.3.0
   alpha line, and its component set has no progress composable. It is a
   future renderer, not a current one.

Both viable routes were rendered through the real framework in Robolectric
native graphics, through `RemoteViews.apply`, on API 26 and API 35. The
bitmap route reproduces the issue's mock exactly; the ring route cannot draw
round caps. Round caps and customization were judged to matter more than the
bitmap memory, which for four 200 px gauges is about 0.64 MB, or roughly
4 % of the budget on a typical phone.

## Decision

### Component

Add `AndroidArcProgressIndicator`, exposed as
`VoltraAndroid.ArcProgressIndicator`, declared in
`packages/generator/data/components.json` with availability "Android 7+" and
`hasChildren: true`. It sits next to `AndroidLinearProgressIndicator` and
`AndroidCircularProgressIndicator` and follows their naming.

Props, with defaults chosen so that the bare component draws the issue's
gauge:

| Prop             | Type                | Default   | Meaning                                                                   |
| ---------------- | ------------------- | --------- | ------------------------------------------------------------------------- |
| `progress`       | number              | `0`       | Fill fraction, clamped to `0..1`                                          |
| `color`          | string              | theme     | Stroke color of the filled arc; accepts every Voltra color string         |
| `trackColor`     | string              | theme     | Stroke color of the unfilled arc; `transparent` hides the track           |
| `strokeWidth`    | number (dp)         | `8`       | Stroke width of both arcs                                                 |
| `startAngle`     | number (degrees)    | `135`     | Where the arc begins; `0` is 3 o'clock, positive is clockwise             |
| `sweepAngle`     | number (degrees)    | `270`     | Total angular length of the track; `360` makes a closed ring              |
| `lineCap`        | `'round' \| 'butt'` | `'round'` | End shape of both arcs                                                    |
| `gradientColors` | string[] (JSON)     | none      | Sweep gradient along the filled arc, from `startAngle`; overrides `color` |

Children are rendered centered on top of the arc. The component owns no
text of its own: a label, an icon, or nothing goes in the middle, exactly as
the app composes it.

The set is deliberately the minimum that covers the known use cases: a gauge
with a gap, a closed ring, a countdown ring, a thin or thick stroke, a
track-less arc, and a gradient arc. Animation, multiple arcs in one
component, tick marks, and text drawn inside the bitmap are out of scope. A
RemoteCompose renderer for API 36+ is a candidate for a later ADR and must
not change this prop contract.

### Encapsulation on Android

Within `packages/android-client/android/src/main/java/voltra`:

- `glance/renderers/arc/ArcSpec.kt` is an immutable Kotlin data class that
  fully describes one rendering: pixel size, progress, angles, stroke pixels,
  cap, ARGB colors, and the optional gradient list. It is the cache key and
  the only input to the renderer. It contains nothing Glance-specific.
- `glance/renderers/arc/ArcBitmapRenderer.kt` turns an `ArcSpec` into an
  ARGB_8888 `Bitmap` using only `android.graphics`. It draws the track, then
  the filled arc with `Paint.Cap.ROUND` or `BUTT`, insets the oval by half
  the stroke so round caps stay inside the bitmap, draws nothing for the
  filled arc when progress is zero, and applies a `SweepGradient` rotated to
  `startAngle` when gradient colors are given. It has no dependency on Glance
  or on the Voltra element model, so it is testable with Robolectric alone.
- `glance/renderers/arc/ArcBitmapCache.kt` is an `LruCache<ArcSpec, Bitmap>`
  bounded in bytes. Identical specs return the same `Bitmap` instance. This
  is what lets `RemoteViews.BitmapCache` deduplicate the image across the
  size variants of a responsive widget, so a fixed-size gauge costs its
  bytes once per widget, not once per variant. A gauge sized relative to the
  widget resolves to a different pixel size per variant and is cached per
  variant.
- `glance/renderers/arc/ArcSizing.kt` is the single place that maps a
  requested dp size to a pixel size: the smaller of the style width and
  height (or the smaller widget dimension when the style says fill, or
  64 dp when nothing is known), times the display density clamped to
  `1..3.5`, capped at 512 px per edge. The bitmap is always square. When the
  cap bites, resolution degrades; the render never fails.
- `glance/components/ArcProgressRenderers.kt` holds the `@Composable`
  `RenderArcProgressIndicator`. It reads the element props, resolves colors
  through the existing color resolution so dynamic and day/night colors
  work, builds an `ArcSpec`, obtains the bitmap from the cache, and emits a
  Glance `Box` with center alignment containing an `Image` that fills the box
  with `ContentScale.Fit`, followed by the children. The `Image` uses
  `ImageProvider(bitmap)`, not `Icon.createWithBitmap`, so the platform both
  counts and deduplicates it. The box takes the style modifiers, so the
  component sizes and aligns like every other Voltra element.
- `RenderCommon.kt` dispatches the new `ComponentTypeID` to that composable
  in both of its overloads. The dispatcher is shared by payload-driven and
  Dynamic widgets, so one implementation serves both kinds.

Nothing outside the `arc` package knows how the bitmap is produced. Nothing
inside it knows about Glance. Existing bitmap renderers (`Chart`, gradients)
are not refactored by this decision; sharing a sizing policy with them is a
separate change.

### Generated and hand-written code

- The generator produces the TypeScript props, the Kotlin parameters class,
  the component id and the short name from the `components.json` entry.
- `packages/android/src/jsx/ArcProgressIndicator.tsx` is the hand-written
  wrapper calling `createVoltraComponent`, exported from `primitives.ts`.
- The Android status components page on the website documents the props,
  the defaults, the memory model, and the fact that the indicator is a
  bitmap, in the same section as the two existing progress indicators.
- The example app gains a widget that shows the issue's two layouts.
- A version plan records a minor bump for the Android packages.

### Verification

- Robolectric native-graphics tests for `ArcBitmapRenderer` assert pixels:
  track color on the track, fill color at the filled end, transparent
  beyond the sweep, round versus flat caps, nothing drawn at zero progress,
  gradient presence, and that the oval inset keeps round caps inside the
  bitmap.
- A cache test asserts instance identity for equal specs and a fresh
  instance for a changed prop.
- A sizing test covers the fixed, fill, unknown, density-clamp and edge-cap
  branches.
- A TypeScript test renders the component to a payload and asserts the id
  and the encoded props, including the JSON-encoded gradient list.

## Consequences

- Android widgets can show the gauge from #204 with round caps, any stroke,
  any angles, and gradients, on every supported Android version, with one
  code path.
- The cost is bitmap memory that scales with pixel size squared. The sizing
  policy keeps a single gauge at most 1 MiB at the 512 px cap and typical
  gauges around a quarter of that; the cache keeps the cost of a fixed-size
  gauge per widget, not per size variant. Very large or very many arcs remain the app author's
  responsibility, and the docs say so.
- The prop contract is renderer-independent. A RemoteCompose backend can
  replace the bitmap on API 36+ later without a breaking change.
- Colors are resolved at composition time on the device, so a bitmap is
  regenerated when the color scheme changes, like `Chart` today.
- The component does not animate. Progress changes redraw the bitmap.
