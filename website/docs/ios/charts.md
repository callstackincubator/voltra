# Charts (iOS)

Render native SwiftUI Charts in your Live Activities and Widgets. Compose charts declaratively with typed mark components — mix and match bars, lines, areas, points, rules, and sectors in a single chart.

:::info
Charts require iOS 16.0+. SectorMark (pie/donut) requires iOS 17.0+.
:::

:::warning
Mark components (`BarMark`, `LineMark`, etc.) must be **direct children** of `<Voltra.Chart>`. They cannot be wrapped in custom components. For example, this will not work:

```tsx
// This won't work — marks are not direct children
function MyMarks() {
  return <Voltra.BarMark data={data} color="#4285f4" />
}

<Voltra.Chart>
  <MyMarks />
</Voltra.Chart>
```

Instead, always place marks directly inside Chart:

```tsx
<Voltra.Chart>
  <Voltra.BarMark data={data} color="#4285f4" />
</Voltra.Chart>
```
:::

## Basic Usage

Wrap one or more mark components inside `<Voltra.Chart>`:

```tsx
<Voltra.Chart>
  <Voltra.BarMark
    data={[
      { x: "Jan", y: 100 },
      { x: "Feb", y: 150 },
      { x: "Mar", y: 130 },
    ]}
    color="#4285f4"
    cornerRadius={4}
  />
</Voltra.Chart>
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
- `cornerRadius` (number, optional): Rounded bar corners in points.
- `width` (number, optional): Fixed bar width in points.
- `stacking` (string, optional): `"standard"` (default, stacked), `"grouped"` (side by side), `"normalized"`, or `"unstacked"`.

```tsx
<Voltra.Chart>
  <Voltra.BarMark
    data={[
      { x: "Q1", y: 200 },
      { x: "Q2", y: 250 },
      { x: "Q3", y: 180 },
    ]}
    color="#4285f4"
    cornerRadius={4}
  />
</Voltra.Chart>
```

---

### LineMark

Line chart with optional curve smoothing and data point symbols.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Line color.
- `lineWidth` (number, optional): Stroke width in points.
- `interpolation` (string, optional): Curve type — `"linear"`, `"monotone"`, `"catmullRom"`, `"cardinal"`, `"stepStart"`, `"stepCenter"`, or `"stepEnd"`.
- `symbol` (string, optional): Symbol at each point — `"circle"`, `"square"`, `"triangle"`, `"diamond"`, or `"cross"`.

```tsx
<Voltra.Chart>
  <Voltra.LineMark
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
    symbol="circle"
  />
</Voltra.Chart>
```

---

### AreaMark

Filled area chart — useful for visualizing volume or ranges.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Fill color.
- `interpolation` (string, optional): Same options as LineMark.
- `stacking` (string, optional): `"standard"`, `"normalized"`, or `"unstacked"`.

```tsx
<Voltra.Chart>
  <Voltra.AreaMark
    data={[
      { x: "Jan", y: 40 },
      { x: "Feb", y: 65 },
      { x: "Mar", y: 50 },
    ]}
    color="#4285f4"
    interpolation="monotone"
  />
</Voltra.Chart>
```

---

### PointMark

Scatter plot / data point markers. Works with both categorical (string) and numeric x values.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Point color.
- `symbol` (string, optional): Same options as LineMark.
- `symbolSize` (number, optional): Symbol size in points.

```tsx
<Voltra.Chart>
  <Voltra.PointMark
    data={[
      { x: 10, y: 30 },
      { x: 25, y: 60 },
      { x: 40, y: 20 },
      { x: 55, y: 80 },
    ]}
    color="#fbbc04"
    symbolSize={60}
  />
</Voltra.Chart>
```

---

### RuleMark

A horizontal or vertical reference line. Unlike other marks, RuleMark has no `data` array.

**Parameters:**

- `yValue` (number, optional): Draw a horizontal line at this y value.
- `xValue` (string, optional): Draw a vertical line at this x value.
- `color` (string, optional): Line color.
- `lineWidth` (number, optional): Stroke width in points.

```tsx
<Voltra.Chart>
  <Voltra.BarMark data={salesData} color="#4285f4" />
  <Voltra.RuleMark yValue={75} color="#ea4335" lineWidth={2} />
</Voltra.Chart>
```

---

### SectorMark

Pie and donut charts. Requires iOS 17+.

**Parameters:**

- `data` (SectorDataPoint[], required): Sector data with `value` and `category`.
- `color` (string, optional): Fill color (overrides automatic coloring).
- `innerRadius` (number, optional): Ratio from 0 to 1. `0` = pie chart, any value above `0` = donut chart.
- `outerRadius` (number, optional): Ratio from 0 to 1.
- `angularInset` (number, optional): Gap between sectors in degrees.

```tsx
// Pie chart
<Voltra.Chart>
  <Voltra.SectorMark
    data={[
      { value: 40, category: "Work" },
      { value: 30, category: "Sleep" },
      { value: 20, category: "Leisure" },
      { value: 10, category: "Exercise" },
    ]}
    angularInset={2}
  />
</Voltra.Chart>

// Donut chart
<Voltra.Chart>
  <Voltra.SectorMark
    data={[
      { value: 40, category: "Work" },
      { value: 30, category: "Sleep" },
      { value: 20, category: "Leisure" },
    ]}
    innerRadius={0.5}
    angularInset={2}
  />
</Voltra.Chart>
```

## Chart Props

The `<Voltra.Chart>` container accepts these props in addition to the standard Voltra `style` prop:

| Prop | Type | Description |
|---|---|---|
| `xAxisVisibility` | `"automatic" \| "visible" \| "hidden"` | Show or hide the x-axis |
| `yAxisVisibility` | `"automatic" \| "visible" \| "hidden"` | Show or hide the y-axis |
| `legendVisibility` | `"automatic" \| "visible" \| "hidden"` | Show or hide the legend |
| `foregroundStyleScale` | `Record<string, string>` | Map series names to colors |
| `chartScrollableAxes` | `"horizontal" \| "vertical"` | Enable scrolling on an axis (iOS 17+) |

## Multi-Series Charts

Add a `series` field to your data points to create grouped or stacked charts. Use `foregroundStyleScale` on the Chart to assign specific colors to each series:

```tsx
<Voltra.Chart foregroundStyleScale={{ Revenue: "#4285f4", Expenses: "#ea4335" }}>
  <Voltra.BarMark
    data={[
      { x: "Q1", y: 200, series: "Revenue" },
      { x: "Q1", y: 150, series: "Expenses" },
      { x: "Q2", y: 250, series: "Revenue" },
      { x: "Q2", y: 180, series: "Expenses" },
    ]}
    cornerRadius={4}
  />
</Voltra.Chart>
```

Without `foregroundStyleScale`, SwiftUI assigns colors automatically.

To show grouped bars (side by side) instead of stacked, set `stacking="grouped"`:

```tsx
<Voltra.Chart foregroundStyleScale={{ A: "#4285f4", B: "#ea4335" }}>
  <Voltra.BarMark data={data} stacking="grouped" cornerRadius={4} />
</Voltra.Chart>
```

## Combining Marks

Mix different mark types in one chart. This is useful for overlaying a trend line on a bar chart, or adding a reference threshold:

```tsx
<Voltra.Chart>
  <Voltra.BarMark data={salesData} color="#4285f4" cornerRadius={4} />
  <Voltra.LineMark data={trendData} color="#ea4335" interpolation="monotone" lineWidth={2} />
  <Voltra.RuleMark yValue={averageValue} color="#fbbc04" lineWidth={1} />
</Voltra.Chart>
```

## Sparkline / Minimal Style

Hide axes and legend for a clean, compact visualization:

```tsx
<Voltra.Chart
  xAxisVisibility="hidden"
  yAxisVisibility="hidden"
  legendVisibility="hidden"
>
  <Voltra.AreaMark
    data={data}
    color="#4285f4"
    interpolation="monotone"
  />
</Voltra.Chart>
```

## Styling the Chart Container

The `<Voltra.Chart>` component supports the full Voltra style system on its container — padding, background, borders, corner radius, shadows, and sizing all work:

```tsx
<Voltra.Chart
  style={{
    width: '100%',
    height: 200,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 8,
  }}
  xAxisVisibility="hidden"
  yAxisVisibility="hidden"
  legendVisibility="hidden"
>
  <Voltra.LineMark data={data} color="#e94560" interpolation="monotone" lineWidth={2} />
</Voltra.Chart>
```