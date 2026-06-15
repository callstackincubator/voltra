# Charts (Android)

Use charts in Android widgets to show trends, comparisons, progress, or composition at a glance. You can mix bars, lines, areas, points, rules, and sectors in a single chart.

:::info
Charts are rendered to a bitmap using the Android Canvas API and displayed as a Glance `Image`. This approach is required because Jetpack Glance has no native charting components.
:::

:::warning
Mark components (`BarMark`, `LineMark`, and the other mark types) must be direct children of `<VoltraAndroid.Chart>`. Do not wrap them in a custom component.
:::

## Basic Usage

Wrap one or more mark components inside `<VoltraAndroid.Chart>`:

```tsx
<VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
  <VoltraAndroid.BarMark
    data={[
      { x: "Jan", y: 100 },
      { x: "Feb", y: 150 },
      { x: "Mar", y: 130 },
    ]}
    color="#4285f4"
    cornerRadius={4}
  />
</VoltraAndroid.Chart>
```

## Data Types

All marks except `RuleMark` take a `data` prop. There are two data shapes depending on the mark type:

```typescript
// BarMark, LineMark, AreaMark, PointMark
type ChartDataPoint = {
  x: string | number  // Categorical ("Jan") or numeric (42)
  y: number
  series?: string     // Optional — groups data for multi-series charts
}

// SectorMark
type SectorDataPoint = {
  value: number       // Proportional angular value
  category: string    // Sector label
}
```

## Marks

### BarMark

Use bars when people need to compare values across categories.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Fill color.
- `cornerRadius` (number, optional): Rounded bar corners.
- `width` (number, optional): Fixed bar width.
- `stacking` (string, optional): `"grouped"` for side-by-side bars in a multi-series chart.

```tsx
<VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
  <VoltraAndroid.BarMark
    data={[
      { x: "Q1", y: 200 },
      { x: "Q2", y: 250 },
      { x: "Q3", y: 180 },
    ]}
    color="#4285f4"
    cornerRadius={4}
  />
</VoltraAndroid.Chart>
```

---

### LineMark

Use a line when the shape of change matters more than individual columns.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Line color.
- `lineWidth` (number, optional): Stroke width.
- `interpolation` (string, optional): `"linear"`, `"monotone"`, `"catmullRom"`, `"cardinal"`, `"stepStart"`, `"stepCenter"`, or `"stepEnd"`.

```tsx
<VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
  <VoltraAndroid.LineMark
    data={[
      { x: "Mon", y: 5 },
      { x: "Tue", y: 8 },
      { x: "Wed", y: 3 },
      { x: "Thu", y: 12 },
      { x: "Fri", y: 7 },
    ]}
    color="#34a853"
    interpolation="monotone"
    lineWidth={2}
  />
</VoltraAndroid.Chart>
```

---

### AreaMark

Use an area chart when you want the overall volume or rise/fall pattern to read quickly.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Fill color.
- `interpolation` (string, optional): Same options as `LineMark`.

```tsx
<VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
  <VoltraAndroid.AreaMark
    data={[
      { x: "Jan", y: 40 },
      { x: "Feb", y: 65 },
      { x: "Mar", y: 50 },
    ]}
    color="#4285f4"
  />
</VoltraAndroid.Chart>
```

---

### PointMark

Use points for sparse measurements, scatter plots, or to emphasize exact observations.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Point color.
- `symbolSize` (number, optional): Point size.

```tsx
<VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
  <VoltraAndroid.PointMark
    data={[
      { x: 10, y: 30 },
      { x: 25, y: 60 },
      { x: 40, y: 20 },
      { x: 55, y: 80 },
    ]}
    color="#fbbc04"
    symbolSize={60}
  />
</VoltraAndroid.Chart>
```

---

### RuleMark

A horizontal or vertical reference line. Unlike other marks, RuleMark has no `data` array.

**Parameters:**

- `yValue` (number, optional): Draw a horizontal line at this y value.
- `xValue` (string | number, optional): Draw a vertical line at this x value.
- `color` (string, optional): Line color.
- `lineWidth` (number, optional): Stroke width.

```tsx
<VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
  <VoltraAndroid.BarMark data={salesData} color="#4285f4" />
  <VoltraAndroid.RuleMark yValue={75} color="#ea4335" lineWidth={2} />
</VoltraAndroid.Chart>
```

---

### SectorMark

Pie and donut charts.

**Parameters:**

- `data` (SectorDataPoint[], required): Sector data with `value` and `category`.
- `color` (string, optional): Fill color (overrides automatic coloring).
- `innerRadius` (number, optional): `0` = pie chart, any value above `0` = donut chart. Values ≤ 1 are treated as a ratio of the max radius; values > 1 are treated as absolute dp.
- `outerRadius` (number, optional): Same behavior as `innerRadius`.
- `angularInset` (number, optional): Gap between sectors in degrees.

```tsx
// Pie chart
<VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
  <VoltraAndroid.SectorMark
    data={[
      { value: 40, category: "Work" },
      { value: 30, category: "Sleep" },
      { value: 20, category: "Leisure" },
      { value: 10, category: "Exercise" },
    ]}
    angularInset={2}
  />
</VoltraAndroid.Chart>

// Donut chart
<VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
  <VoltraAndroid.SectorMark
    data={[
      { value: 40, category: "Work" },
      { value: 30, category: "Sleep" },
      { value: 20, category: "Leisure" },
    ]}
    innerRadius={40}
    outerRadius={90}
    angularInset={2}
  />
</VoltraAndroid.Chart>
```

## Chart Props

The `<VoltraAndroid.Chart>` container accepts these props in addition to the standard `style` prop:

| Prop | Type | Description |
|---|---|---|
| `xAxisVisibility` | `"automatic" \| "visible" \| "hidden"` | Show or hide the x-axis |
| `xAxisGridStyle` | `{ visible?: boolean }` | Show or hide x-axis grid lines |
| `yAxisVisibility` | `"automatic" \| "visible" \| "hidden"` | Show or hide the y-axis |
| `yAxisGridStyle` | `{ visible?: boolean }` | Show or hide y-axis grid lines |
| `foregroundStyleScale` | `Record<string, string>` | Map series names to colors |

## Grid Lines

Hide grid lines when you want the chart to feel more compact:

```tsx
<VoltraAndroid.Chart
  style={{ width: '100%', height: '100%' }}
  xAxisGridStyle={{ visible: false }}
  yAxisGridStyle={{ visible: false }}
>
  <VoltraAndroid.LineMark data={data} color="#4285f4" interpolation="monotone" />
</VoltraAndroid.Chart>
```

## Multi-Series Charts

Add a `series` field to your data points when you want multiple datasets in the same chart. Use `foregroundStyleScale` to keep those series colors consistent:

```tsx
<VoltraAndroid.Chart
  style={{ width: '100%', height: '100%' }}
  foregroundStyleScale={{ Revenue: "#4285f4", Expenses: "#ea4335" }}
>
  <VoltraAndroid.BarMark
    data={[
      { x: "Q1", y: 200, series: "Revenue" },
      { x: "Q1", y: 150, series: "Expenses" },
      { x: "Q2", y: 250, series: "Revenue" },
      { x: "Q2", y: 180, series: "Expenses" },
    ]}
    cornerRadius={4}
  />
</VoltraAndroid.Chart>
```

Without `foregroundStyleScale`, colors are chosen automatically.

For side-by-side bars, set `stacking="grouped"`:

```tsx
<VoltraAndroid.Chart
  style={{ width: '100%', height: '100%' }}
  foregroundStyleScale={{ A: "#4285f4", B: "#ea4335" }}
>
  <VoltraAndroid.BarMark data={data} stacking="grouped" cornerRadius={4} />
</VoltraAndroid.Chart>
```

## Combining Marks

Mix mark types when one chart needs both context and emphasis, such as bars for totals plus a rule for a target:

```tsx
<VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
  <VoltraAndroid.BarMark data={salesData} color="#4285f4" cornerRadius={4} />
  <VoltraAndroid.LineMark data={trendData} color="#ea4335" lineWidth={2} />
  <VoltraAndroid.RuleMark yValue={averageValue} color="#fbbc04" lineWidth={1} />
</VoltraAndroid.Chart>
```

## Sparkline / Minimal Style

Hide axes for a clean, compact visualization:

```tsx
<VoltraAndroid.Chart
  style={{ width: '100%', height: '100%' }}
  xAxisVisibility="hidden"
  yAxisVisibility="hidden"
>
  <VoltraAndroid.AreaMark
    data={data}
    color="#4285f4"
  />
</VoltraAndroid.Chart>
```

## Sizing

Chart dimensions are read from the `style` prop:

- **Fixed size**: `style={{ width: 300, height: 200 }}`
- **Fill parent**: `style={{ width: '100%', height: '100%' }}`

If no width or height is specified, the chart defaults to 300×200 dp.

## Platform Notes

- `legendVisibility` is not currently available on Android charts.
- Point markers are circular on Android.
- `innerRadius` and `outerRadius` on `SectorMark` accept either a ratio (`0` to `1`) or a larger fixed value.
