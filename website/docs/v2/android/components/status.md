# Data Visualization & Status (Android)

Components for displaying data and status information on Android widgets.

### LinearProgressIndicator

A horizontal progress bar.

**Parameters:**

- `progress` (number, optional): Current progress value (0.0 to 1.0). If omitted, the indicator will be indeterminate.
- `color` (string, optional): Color for the progress indicator.
- `backgroundColor` (string, optional): Color for the background track.

---

### CircularProgressIndicator

A circular progress indicator.

**Parameters:**

- `color` (string, optional): Color for the progress indicator.

:::warning Indeterminate Only
Due to Jetpack Compose Glance limitations, the `CircularProgressIndicator` on Android renders in **indeterminate** mode.
:::

---

### ArcProgressIndicator

A determinate arc gauge: a partial ring whose stroke fills clockwise, with rounded ends and a gap
at the bottom by default. Children are centered on top of the arc, so a label, an icon, or nothing
goes in the middle.

**Parameters:**

- `progress` (number, optional): Fill fraction, clamped to 0.0–1.0. Defaults to `0`.
- `color` (string, optional): Stroke color of the filled arc. Defaults to the widget theme's progress color.
- `trackColor` (string, optional): Stroke color of the unfilled arc. Defaults to the widget theme's track color; use `transparent` to hide the track.
- `strokeWidth` (number, optional): Stroke width in dp of both arcs. Defaults to `8`.
- `startAngle` (number, optional): Angle in degrees where the arc begins. `0` is 3 o'clock and positive is clockwise. Defaults to `135`.
- `sweepAngle` (number, optional): Total angular length of the track in degrees. `360` makes a closed ring. Defaults to `270`.
- `lineCap` (`'round' | 'butt'`, optional): End shape of both arcs. Defaults to `'round'`.
- `gradientColors` (string[], optional): Sweep gradient along the filled arc, starting at `startAngle`. Overrides `color`.

```tsx
<VoltraAndroid.ArcProgressIndicator
  progress={0.75}
  color="#22C55E"
  trackColor="#1F2937"
  strokeWidth={14}
  style={{ width: 140, height: 140 }}
>
  <VoltraAndroid.Text style={{ fontSize: 28, fontWeight: 'bold' }}>75%</VoltraAndroid.Text>
</VoltraAndroid.ArcProgressIndicator>
```

Unlike the other two indicators, this one works on every supported Android version, because it is
drawn as a bitmap rather than composed from a Glance progress primitive.

:::warning Bitmap Memory
The arc is a bitmap, so it costs memory that grows with the square of its pixel size. Voltra sizes
it from the smaller of the component's width and height, multiplies by the display density clamped
to 1–3.5, and caps each edge at 512 px, which keeps a single gauge under 1 MB. Identical gauges
share one bitmap, so a gauge costs its bytes once per widget rather than once per responsive size
variant. The system caps the bitmaps of one widget instance at roughly 1.5 screens' worth of
pixels, so very large or very many arcs in a single widget remain your responsibility.
:::

The indicator does not animate. Changing `progress` redraws it.
