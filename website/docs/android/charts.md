# Charts (Android)

Render charts in your Android Glance widgets. Compose charts declaratively with typed mark components — mix and match bars, lines, areas, points, rules, and sectors in a single chart.

:::info
Charts are rendered to a bitmap using the Android Canvas API and displayed as a Glance `Image`. This approach is required because Jetpack Glance has no native charting components.
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

Vertical bars.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Fill color.
- `cornerRadius` (number, optional): Rounded bar corners in pixels.
- `width` (number, optional): Fixed bar width in pixels.
- `stacking` (string, optional): `"standard"` (default, stacked) or `"grouped"` (side by side).

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

Line chart connecting data points.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Line color.
- `lineWidth` (number, optional): Stroke width in pixels.

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
    lineWidth={2}
  />
</VoltraAndroid.Chart>
```

---

### AreaMark

Filled area chart — useful for visualizing volume or ranges.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Fill color.

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

Scatter plot / data point markers. Works with both categorical (string) and numeric x values.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Point color.
- `symbolSize` (number, optional): Symbol size in pixels.

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
- `lineWidth` (number, optional): Stroke width in pixels.

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
| `yAxisVisibility` | `"automatic" \| "visible" \| "hidden"` | Show or hide the y-axis |
| `legendVisibility` | `"automatic" \| "visible" \| "hidden"` | Show or hide the legend |
| `foregroundStyleScale` | `Record<string, string>` | Map series names to colors |

## Multi-Series Charts

Add a `series` field to your data points to create grouped or stacked charts. Use `foregroundStyleScale` on the Chart to assign specific colors to each series:

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

Without `foregroundStyleScale`, colors are assigned automatically from a built-in palette.

To show grouped bars (side by side) instead of stacked, set `stacking="grouped"`:

```tsx
<VoltraAndroid.Chart
  style={{ width: '100%', height: '100%' }}
  foregroundStyleScale={{ A: "#4285f4", B: "#ea4335" }}
>
  <VoltraAndroid.BarMark data={data} stacking="grouped" cornerRadius={4} />
</VoltraAndroid.Chart>
```

## Combining Marks

Mix different mark types in one chart. This is useful for overlaying a trend line on a bar chart, or adding a reference threshold:

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

- **Fixed size**: `style={{ width: 300, height: 200 }}` — renders at exactly 300×200 dp.
- **Fill parent**: `style={{ width: '100%', height: '100%' }}` — expands to fill the available space. The bitmap is rendered at a default size and scaled by Glance to fit.

If no width or height is specified, the chart defaults to 300×200 dp.

## Differences from iOS

| Feature | iOS | Android |
|---|---|---|
| Rendering | Native SwiftUI Charts | Canvas bitmap → Glance Image |
| Interpolation curves | `monotone`, `catmullRom`, `cardinal`, `stepStart`, `stepCenter`, `stepEnd` | Linear only |
| Symbol shapes | `circle`, `square`, `triangle`, `diamond`, `cross` | Circle only |
| `chartScrollableAxes` | Supported (iOS 17+) | Not supported |
| `SectorMark` radius | Ratio (0–1) only | Ratio (0–1) or absolute dp (> 1) |
| Legend | Native SwiftUI legend | Not yet supported |
