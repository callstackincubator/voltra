# Layout & Containers (Android)

Components that arrange other elements or provide structural grouping using Jetpack Compose Glance primitives. See [Styling](../development/styling) for details on layout and spacing properties.

### Column

A vertical container that arranges its children in a column.

**Parameters:**

- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.
- `verticalAlignment` (string, optional): `"top"`, `"center-vertically"`, `"bottom"`.

---

### Row

A horizontal container that arranges its children in a row.

**Parameters:**

- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.
- `verticalAlignment` (string, optional): `"top"`, `"center-vertically"`, `"bottom"`.

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

A component that displays a title bar with an optional icon.

**Parameters:**

- `title` (string): Title text to display.
- `startIcon` (object): `{ assetName: string }`.
- `textColor` (string, optional).
- `iconColor` (string, optional).
- `fontFamily` (string, optional).

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

---

### LazyVerticalGrid

A scrollable grid of items.

**Parameters:**

- `columns` (number | `"adaptive"`): Number of columns or `"adaptive"` for an adaptive grid.
- `minSize` (number, optional): Minimum size (in dp) for items in adaptive grid mode.
- `horizontalAlignment` (string, optional): `"start"`, `"center-horizontally"`, `"end"`.
- `verticalAlignment` (string, optional): `"top"`, `"center"`, `"bottom"`.
