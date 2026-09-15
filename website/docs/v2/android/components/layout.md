# Layout & Containers (Android)

Components that arrange other elements or provide structural grouping using Jetpack Compose Glance primitives. See [Styling](../development/styling) for details on layout and spacing properties.

### Column

A vertical container that arranges its children in a column.

:::warning Glance limit
`Column` supports at most 10 direct rendered children. Jetpack Glance truncates extra children. This includes spacer views inserted by the `gap` style, so a `gap` on a `Column` with many children can push it over the limit. Use `LazyColumn` for dynamic or scrollable collections.
:::

**Parameters:**

- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.
- `verticalAlignment` (string, optional): `"top"`, `"center-vertically"`, `"bottom"`.

Supports the `gap` style to space children apart vertically.

---

### Row

A horizontal container that arranges its children in a row.

:::warning Glance limit
`Row` supports at most 10 direct rendered children. Jetpack Glance truncates extra children. This includes spacer views inserted by the `gap` style, so a `gap` on a `Row` with many children can push it over the limit. Use `LazyColumn` for dynamic or scrollable collections.
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

**Parameters:**

- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.

Supports the `gap` style: each item is padded on its bottom edge to space it from the next item, without changing the item count.

---

### LazyVerticalGrid

A scrollable grid of items.

**Parameters:**

- `columns` (number | `"adaptive"`): Number of columns or `"adaptive"` for an adaptive grid.
- `minSize` (number, optional): Minimum size (in dp) for items in adaptive grid mode.
- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.
- `verticalAlignment` (string, optional): `"top"`, `"center"`, `"bottom"`.

Supports the `gap` style: each cell is padded by half the gap on every edge, so adjacent cells get a full gap between them while the outer edge of the grid gets a half gap.
