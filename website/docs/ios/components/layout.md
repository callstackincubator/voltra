# Layout & Containers (iOS)

Components that arrange other elements or provide structural grouping using SwiftUI's layout model.

## Alignment & Positioning

Voltra uses SwiftUI's native positioning model. Instead of CSS-style `position: absolute` with `top`/`left`/`right`/`bottom`, you use:

1. **Stack `alignment` props** - Position children within their container
2. **`offsetX`/`offsetY` styles** - Fine-tune individual element positions

### VStack

A vertical stack container that arranges its children in a column.

**Parameters:**

- `spacing` (number, optional): Spacing between children in points
- `alignment` (string, optional): Horizontal alignment of children: `"leading"`, `"center"` (default), `"trailing"`

---

### HStack

A horizontal stack container that arranges its children in a row.

**Parameters:**

- `spacing` (number, optional): Spacing between children in points
- `alignment` (string, optional): Vertical alignment of children: `"top"`, `"center"` (default), `"bottom"`, `"firstTextBaseline"`, `"lastTextBaseline"`

---

### ZStack

A depth-based stack container that overlays its children on top of each other.

**Parameters:**

- `alignment` (string, optional): Positions ALL children at the specified alignment point.

---

### Spacer

A flexible space component that expands to fill available space in its container.

**Parameters:**

- `minLength` (number, optional): Minimum length

---

### GroupBox

A grouped content container that visually groups related content with a styled background.

---

### GlassContainer

A Liquid Glass container that provides a modern glassmorphism effect for grouping content (iOS 18+).
