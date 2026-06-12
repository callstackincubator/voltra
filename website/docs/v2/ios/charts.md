# Charts (iOS)

Use charts in Live Activities and widgets to show trends, comparisons, progress, or composition at a glance. You can mix bars, lines, areas, points, rules, and sectors in a single chart.

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

Use bars when people need to compare values across categories.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Fill color.
- `cornerRadius` (number, optional): Rounded bar corners.
- `width` (number, optional): Fixed bar width.
- `stacking` (string, optional): `"grouped"` (side by side).

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

Use a line when the shape of change matters more than individual columns.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Line color.
- `lineWidth` (number, optional): Stroke width in points.
- `interpolation` (string, optional): Curve type — `"linear"`, `"monotone"`, `"catmullRom"`, `"cardinal"`, `"stepStart"`, `"stepCenter"`, or `"stepEnd"`.
- `symbol` (string, optional): Symbol at each point — `"circle"`, `"square"`, `"triangle"`, `"diamond"`, `"pentagon"`, `"cross"`, `"plus"`, or `"asterisk"`.

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

Use an area chart when you want the overall volume or rise/fall pattern to read quickly.

**Parameters:**

- `data` (ChartDataPoint[], required): The data points.
- `color` (string, optional): Fill color.
- `interpolation` (string, optional): Same options as LineMark.

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

Use points for sparse measurements, scatter plots, or to emphasize exact observations.

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
- `xValue` (string | number, optional): Draw a vertical line at this x value.
- `color` (string, optional): Line color.
- `lineWidth` (number, optional): Stroke width in points.

If both `xValue` and `yValue` are provided, Voltra renders both lines.

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
| `xAxisGridStyle` | `{ visible?: boolean; color?: string; lineWidth?: number; dash?: number[] }` | Control x-axis grid lines |
| `yAxisVisibility` | `"automatic" \| "visible" \| "hidden"` | Show or hide the y-axis |
| `yAxisGridStyle` | `{ visible?: boolean; color?: string; lineWidth?: number; dash?: number[] }` | Control y-axis grid lines |
| `legendVisibility` | `"automatic" \| "visible" \| "hidden"` | Show or hide the legend |
| `foregroundStyleScale` | `Record<string, string>` | Map series names to colors |

## Grid Lines

Use `xAxisGridStyle` and `yAxisGridStyle` when the default grid is too busy or not visible enough for your design:

```tsx
<Voltra.Chart
  xAxisGridStyle={{ visible: false }}
  yAxisGridStyle={{ color: "#d0d7de", lineWidth: 1, dash: [4, 2] }}
>
  <Voltra.LineMark data={data} color="#4285f4" interpolation="monotone" />
</Voltra.Chart>
```

## Multi-Series Charts

Add a `series` field to your data points when you want multiple datasets in the same chart. Use `foregroundStyleScale` to keep those series colors consistent:

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

Without `foregroundStyleScale`, colors are chosen automatically.

For side-by-side bars, set `stacking="grouped"`:

```tsx
<Voltra.Chart foregroundStyleScale={{ A: "#4285f4", B: "#ea4335" }}>
  <Voltra.BarMark data={data} stacking="grouped" cornerRadius={4} />
</Voltra.Chart>
```

## Combining Marks

Mix mark types when one chart needs both context and emphasis, such as bars for totals plus a rule for a target:

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

## Widget / Live Activity Notes

Charts in widgets and Live Activities are static. Focus on a clear snapshot of the data rather than interactions like panning or scrolling.

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
