# Charts

Use this reference for Voltra chart UI, chart docs, or chart API questions.

## Domain Rules

- Verify chart behavior against the public JSX props and the platform renderer before changing docs or examples.
- Keep chart guidance user-facing. Explain when to use a mark or prop, not how the native renderer works, unless the constraint changes what users can do.
- Mark components must be direct children of `Chart`.
- Use `Voltra.Chart` from `voltra` for iOS chart UI.
- Use `VoltraAndroid.Chart` from `voltra/android` for Android chart UI.
- If the task involves widget or Live Activity layout around a chart, also read the relevant platform widget reference.

## iOS Support

- Available in iOS widgets and Live Activities.
- `SectorMark` requires iOS 17+.
- `Chart` supports:
  - `xAxisVisibility`
  - `yAxisVisibility`
  - `xAxisGridStyle`
  - `yAxisGridStyle`
  - `legendVisibility`
  - `foregroundStyleScale`
- `BarMark` supports grouped bars with `stacking="grouped"`.
- `LineMark` and `AreaMark` support interpolation.
- `LineMark` and `PointMark` support symbols.
- Do not document `chartScrollableAxes` as a supported user-facing prop for iOS charts unless the implementation is restored.

## Android Support

- Available in Android widgets.
- Charts are rendered to a bitmap and shown in the widget.
- `Chart` supports:
  - `xAxisVisibility`
  - `yAxisVisibility`
  - `xAxisGridStyle` with visibility-only behavior
  - `yAxisGridStyle` with visibility-only behavior
  - `foregroundStyleScale`
- Do not document `legendVisibility` as supported on Android charts.
- `LineMark` and `AreaMark` support interpolation.
- `PointMark` renders circular markers on Android.
- `SectorMark` supports ratio-based radii and fixed radii values greater than `1`.
- Grouped bars are supported with `stacking="grouped"`. Do not claim other stacking modes unless the renderer supports them.

## Verification Targets

- Public JSX props:
  - `src/jsx/Chart.tsx`
  - `src/android/jsx/Chart.tsx`
  - `src/jsx/BarMark.tsx`
  - `src/jsx/LineMark.tsx`
  - `src/jsx/AreaMark.tsx`
  - `src/jsx/PointMark.tsx`
  - `src/jsx/RuleMark.tsx`
  - `src/jsx/SectorMark.tsx`
  - `src/android/jsx/BarMark.tsx`
  - `src/android/jsx/LineMark.tsx`
  - `src/android/jsx/AreaMark.tsx`
  - `src/android/jsx/PointMark.tsx`
  - `src/android/jsx/RuleMark.tsx`
  - `src/android/jsx/SectorMark.tsx`
- Native implementations:
  - `ios/ui/Views/VoltraChart.swift`
  - `android/src/main/java/voltra/glance/renderers/ChartRenderers.kt`
  - `android/src/main/java/voltra/glance/renderers/ChartBitmapRenderer.kt`
