---
title: "Layout & Containers (Android)"
description: "Reference for Voltra Android layout components built on Jetpack Compose Glance, such as Column, Row, and Box, and their Glance limits."
---

Components that arrange other elements or provide structural grouping using Jetpack Compose Glance primitives. See [Styling](/android/development/styling) for details on layout and spacing properties.

### Column

A vertical container that arranges its children in a column.

:::caution[Glance limit]
`Column` supports at most 10 direct rendered children. Jetpack Glance truncates extra children. Use `LazyColumn` for dynamic or scrollable collections.
:::

**Parameters:**

- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.
- `verticalAlignment` (string, optional): `"top"`, `"center-vertically"`, `"bottom"`.

Supports the `gap` style to space children apart vertically.

---

### Row

A horizontal container that arranges its children in a row.

:::caution[Glance limit]
`Row` supports at most 10 direct rendered children. Jetpack Glance truncates extra children. Use `LazyColumn` for dynamic or scrollable collections.
:::

**Parameters:**

- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.
- `verticalAlignment` (string, optional): `"top"`, `"center-vertically"`, `"bottom"`.

Supports the `gap` style to space children apart horizontally.

---

### Box

A container that stacks its children on top of each other.

**Parameters:**

- `contentAlignment` (string, optional): Combined alignment. Supports `"top-start"`, `"top-center"`, `"top-end"`, `"center-start"`, `"center"`, `"center-end"`, `"bottom-start"`, `"bottom-center"`, `"bottom-end"`.

---

### Scaffold

A top-level container that provides a standard layout structure for widgets.

**Parameters:**

- `backgroundColor` (string, optional): Background color for the scaffold.
- `horizontalPadding` (number, optional): Horizontal padding in dp.

---

### TitleBar

A component that displays a title bar with a required leading icon.

**Parameters:**

- `title` (string): Title text to display.
- `startIcon` (object, required): `{ assetName: string }` or `{ base64: string }`.
- `textColor` (string, optional).
- `iconColor` (string, optional).
- `fontFamily` (string, optional): `"monospace"`, `"serif"`, `"sans-serif"`, or `"cursive"`.

---

### Spacer

A component that provides fixed spacing between elements.

**Parameters:**

- `size` (number): Size of the spacer in dp.

---

### LazyColumn

A scrollable vertical list that only renders visible items.

`LazyColumn` renders in `VoltraWidgetPreview`. On Android 12 (API 31) and older it falls back
to a non-scrolling approximation that renders every item eagerly, because Glance's collection
adapters need a real AppWidget host on those versions. Inside a scrolling screen, the preview shows the list's items, but dragging scrolls the page, not the list.

**Parameters:**

- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.

Supports the `gap` style to space items apart vertically.

---

### LazyVerticalGrid

A scrollable grid of items.

`LazyVerticalGrid` renders in `VoltraWidgetPreview`. On Android 12 (API 31) and older it falls
back to a non-scrolling approximation that renders every item eagerly, because Glance's
collection adapters need a real AppWidget host on those versions. Inside a scrolling screen, the preview shows the grid's items, but dragging scrolls the page, not the grid.

**Parameters:**

- `columns` (number | `{ type: 'fixed', count: number }` | `{ type: 'adaptive', minSize: number }`, optional): Number of columns, from 1 to 5, or an adaptive grid whose cells are at least `minSize` dp wide. Defaults to 2. On Android 11 and older, an adaptive grid gets 2 columns.
- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.

Supports the `gap` style to space cells apart horizontally and vertically. With a fixed number of `columns`, the gap goes only between cells. With adaptive columns, the grid's outer edge also gets half the gap.
