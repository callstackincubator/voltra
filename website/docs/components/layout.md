# Layout & Containers

Components that arrange other elements or provide structural grouping.

## Alignment & Positioning

Voltra uses SwiftUI's native positioning model. Instead of CSS-style `position: absolute` with `top`/`left`/`right`/`bottom`, you use:

1. **Stack `alignment` props** - Position children within their container
2. **`offsetX`/`offsetY` styles** - Fine-tune individual element positions

Each stack type has different alignment options based on its layout direction.

---

### VStack

A vertical stack container that arranges its children in a column.

**Parameters:**

- `spacing` (number, optional): Spacing between children in points
- `alignment` (string, optional): Horizontal alignment of children:
  - `"leading"` (default) - Align to left edge
  - `"center"` - Align to center
  - `"trailing"` - Align to right edge

**Apple Documentation:** [VStack](https://developer.apple.com/documentation/swiftui/vstack)

---

### HStack

A horizontal stack container that arranges its children in a row.

**Parameters:**

- `spacing` (number, optional): Spacing between children in points
- `alignment` (string, optional): Vertical alignment of children:
  - `"top"` - Align to top edge
  - `"center"` (default) - Align to center
  - `"bottom"` - Align to bottom edge
  - `"firstTextBaseline"` - Align to first text baseline
  - `"lastTextBaseline"` - Align to last text baseline

**Apple Documentation:** [HStack](https://developer.apple.com/documentation/swiftui/hstack)

---

### ZStack

A depth-based stack container that overlays its children on top of each other. Use ZStack when you need to layer elements, such as placing a badge over an image.

**Parameters:**

- `alignment` (string, optional): Positions ALL children at the specified alignment point. Available values:
  - `"center"` (default) - Center of the stack
  - `"leading"` - Left edge (or right in RTL)
  - `"trailing"` - Right edge (or left in RTL)
  - `"top"` - Top edge
  - `"bottom"` - Bottom edge
  - `"topLeading"` - Top-left corner
  - `"topTrailing"` - Top-right corner
  - `"bottomLeading"` - Bottom-left corner
  - `"bottomTrailing"` - Bottom-right corner

**Apple Documentation:** [ZStack](https://developer.apple.com/documentation/swiftui/zstack)

#### Positioning with ZStack

In SwiftUI (and Voltra), positioning works differently than CSS. The `alignment` prop on ZStack positions **all children** at the same alignment point. The ZStack's size is determined by its largest child.

**Example: Badge overlay**

```tsx
<Voltra.ZStack alignment="topTrailing">
  {/* Image defines the ZStack size */}
  <Voltra.Image
    source={{ assetName: 'avatar' }}
    style={{ width: 60, height: 60, borderRadius: 30 }}
  />
  
  {/* Badge is positioned at top-right, then nudged with offset */}
  <Voltra.Text
    style={{
      backgroundColor: '#FF3B30',
      color: '#FFFFFF',
      fontSize: 10,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 6,
      offsetX: 4,  // Nudge right (partially outside)
      offsetY: -4, // Nudge up (partially outside)
    }}
  >
    3
  </Voltra.Text>
</Voltra.ZStack>
```

:::tip
Use `offsetX` and `offsetY` style properties to fine-tune individual element positions after alignment. Positive `offsetX` moves right, positive `offsetY` moves down.
:::

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
