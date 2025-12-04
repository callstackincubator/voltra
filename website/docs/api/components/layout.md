# Layout & Containers

Components that arrange other elements or provide structural grouping.

### VStack

A vertical stack container that arranges its children in a column.

**Parameters:**

- `spacing` (number, optional): Spacing between children
- `alignment` (string, optional): Horizontal alignment - `"leading"`, `"center"`, or `"trailing"`

**Apple Documentation:** [VStack](https://developer.apple.com/documentation/swiftui/vstack)

---

### HStack

A horizontal stack container that arranges its children in a row.

**Parameters:**

- `spacing` (number, optional): Spacing between children
- `alignment` (string, optional): Vertical alignment - `"top"`, `"center"`, or `"bottom"`

**Apple Documentation:** [HStack](https://developer.apple.com/documentation/swiftui/hstack)

---

### ZStack

A depth-based stack container that overlays its children on top of each other.

**Parameters:**

- `alignment` (string, optional): Child alignment

**Apple Documentation:** [ZStack](https://developer.apple.com/documentation/swiftui/zstack)

---

### Spacer

A flexible space component that expands to fill available space in its container.

**Parameters:**

- `minLength` (number, optional): Minimum length

**Apple Documentation:** [Spacer](https://developer.apple.com/documentation/swiftui/spacer)

---

### GroupBox

A grouped content container that visually groups related content with a styled background.

**Parameters:** None

**Apple Documentation:** [GroupBox](https://developer.apple.com/documentation/swiftui/groupbox)

---

### GlassContainer

A Liquid Glass container that provides a modern glassmorphism effect for grouping content (iOS 18+).

**Parameters:**

- `spacing` (number, optional): Spacing between glass elements

**Apple Documentation:** [GlassContainer](https://developer.apple.com/documentation/swiftui/glasscontainer)
