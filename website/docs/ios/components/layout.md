# Layout & Containers (iOS)

Components that arrange other elements or provide structural grouping.

## Alignment & Positioning

Voltra uses SwiftUI's native positioning model. Instead of CSS-style `position: absolute` with `top`/`left`/`right`/`bottom`, you use:

1. **Stack `alignment` props** - Position children within their container
2. **`offsetX`/`offsetY` styles** - Fine-tune individual element positions

Each stack type has different alignment options based on its layout direction.

---

### VStack

A vertical stack container that arranges its children in a column.

:::tip Flexbox Option
VStack can optionally use a flexbox layout engine by setting `layout="flex"`. This enables React Native-style flexbox properties like `justifyContent` and `alignItems` via the `style` prop. See [Flexbox Layout](../development/flexbox-layout) for details.
:::

**Parameters:**

- `spacing` (number, optional): Spacing between children in points
- `alignment` (string, optional): Horizontal alignment of children:
  - `"leading"` - Align to left edge
  - `"center"` (default) - Align to center
  - `"trailing"` - Align to right edge
- `layout` (string, optional): Layout mode - `"stack"` (default) or `"flex"`. When set to `"flex"`, enables flexbox properties via style prop.

**Apple Documentation:** [VStack](https://developer.apple.com/documentation/swiftui/vstack)

---

### HStack

A horizontal stack container that arranges its children in a row.

:::tip Flexbox Option
HStack can optionally use a flexbox layout engine by setting `layout="flex"`. This enables React Native-style flexbox properties like `justifyContent` and `alignItems` via the `style` prop. See [Flexbox Layout](../development/flexbox-layout) for details.
:::

**Parameters:**

- `spacing` (number, optional): Spacing between children in points
- `alignment` (string, optional): Vertical alignment of children:
  - `"top"` - Align to top edge
  - `"center"` (default) - Align to center
  - `"bottom"` - Align to bottom edge
  - `"firstTextBaseline"` - Align to first text baseline
  - `"lastTextBaseline"` - Align to last text baseline
- `layout` (string, optional): Layout mode - `"stack"` (default) or `"flex"`. When set to `"flex"`, enables flexbox properties via style prop.

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

### View

A flexible container component that **always uses flexbox layout**. Unlike VStack and HStack which use native SwiftUI stacks by default, View is specifically designed for React Native-style flexbox layouts.

:::tip Flexbox-First Component
The View component is purpose-built for flexbox layouts and always uses the flexbox layout engine. You don't need to add `layout="flex"` – it's flexbox by default. See the [Flexbox Layout](../development/flexbox-layout) guide for comprehensive documentation.
:::

**Style Properties:**

View responds to flexbox style properties set via the `style` prop:

- `flexDirection`: `'row'` | `'column'` (default: `'column'`)
- `alignItems`: `'flex-start'` | `'center'` | `'flex-end'` | `'stretch'`
- `justifyContent`: `'flex-start'` | `'center'` | `'flex-end'` | `'space-between'` | `'space-around'` | `'space-evenly'`
- `gap`: Spacing between children in points

**Example:**

```tsx
// Horizontal layout with space between
<Voltra.View
  style={{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#101828',
    borderRadius: 12
  }}
>
  <Voltra.Text style={{ color: '#FFFFFF' }}>Left</Voltra.Text>
  <Voltra.Text style={{ color: '#FFFFFF' }}>Center</Voltra.Text>
  <Voltra.Text style={{ color: '#FFFFFF' }}>Right</Voltra.Text>
</Voltra.View>

// Vertical layout with centered items
<Voltra.View
  style={{
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 16
  }}
>
  <Voltra.Symbol name="checkmark.circle" tintColor="#10B981" />
  <Voltra.Text style={{ color: '#10B981' }}>Success</Voltra.Text>
</Voltra.View>
```

**When to use View:**

- You need React Native-style flexbox behavior
- You want dynamic `flexDirection` (switching between row/column)
- You need `justifyContent` spacing modes

**When to use VStack/HStack:**

- Simple vertical or horizontal layouts
- You want SwiftUI's native stack performance
- You need SwiftUI-specific alignment (like firstTextBaseline)

**Availability:** iOS 16.0+

**Learn More:** [Flexbox Layout Guide](../development/flexbox-layout)

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

A Liquid Glass container that wraps Apple's [`GlassEffectContainer`](https://developer.apple.com/documentation/swiftui/glasseffectcontainer) to provide a modern glassmorphism effect for grouping content.

:::warning iOS 26 SDK Required
This component uses Apple's `GlassEffectContainer` API which requires **Xcode with iOS 26 SDK** to build. If you're using an older Xcode version, you'll encounter build errors:

```
- value of type 'some View' has no member 'glassEffect'
- cannot find 'GlassEffectContainer' in scope
```

**Workaround:** Avoid using this component until iOS 26 SDK is available in your Xcode version. At runtime, devices with iOS < 26 will gracefully fall back to a regular container without the glass effect.
:::

**Parameters:**

- `spacing` (number, optional): Spacing between glass elements

**Availability:**
- **Build:** Requires Xcode with iOS 26 SDK (uses `GlassEffectContainer` API)
- **Runtime:** iOS 26+ for glass effect, graceful fallback on earlier versions

**Apple Documentation:** [GlassEffectContainer](https://developer.apple.com/documentation/swiftui/glasseffectcontainer)
