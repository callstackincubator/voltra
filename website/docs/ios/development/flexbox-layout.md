# Flexbox Layout

:::warning Opt-In Feature
Flexbox layout is **opt-in** and not enabled by default in Voltra. To use flexbox properties, you must explicitly enable flexbox mode using one of the three methods described below. Regular VStack and HStack components use native SwiftUI stacks and do not support flexbox properties.
:::

Voltra brings React Native-style flexbox capabilities to iOS, providing powerful layout control with familiar APIs. This guide covers everything you need to know about using flexbox in your Voltra applications.

## Three Ways to Enable Flexbox

### 1. Use the View Component (Always Flexbox)

The `View` component is purpose-built for flexbox layouts and always uses the flexbox layout engine:

```tsx
<Voltra.View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
  <Voltra.Text>Left</Voltra.Text>
  <Voltra.Text>Right</Voltra.Text>
</Voltra.View>
```

### 2. VStack with layout="flex"

Add the `layout="flex"` prop to VStack to enable flexbox mode:

```tsx
<Voltra.VStack layout="flex" style={{ justifyContent: 'space-between' }}>
  <Voltra.Text>Top</Voltra.Text>
  <Voltra.Text>Bottom</Voltra.Text>
</Voltra.VStack>
```

### 3. HStack with layout="flex"

Add the `layout="flex"` prop to HStack to enable flexbox mode:

```tsx
<Voltra.HStack layout="flex" style={{ justifyContent: 'space-evenly' }}>
  <Voltra.Text>Item 1</Voltra.Text>
  <Voltra.Text>Item 2</Voltra.Text>
  <Voltra.Text>Item 3</Voltra.Text>
</Voltra.HStack>
```

**Availability:** iOS 16.0+ (requires SwiftUI Layout protocol)

## Why Use Flexbox?

### When to Use Flexbox

Choose flexbox layout when you need:

- **React Native familiarity**: You're coming from React Native and want the same flexbox mental model
- **Advanced spacing**: `justifyContent` modes like `space-between`, `space-around`, or `space-evenly`
- **Dynamic flex direction**: Switching between row and column layouts at runtime
- **Flex grow/shrink**: Proportional sizing with `flexGrow`, `flexShrink`, and `flexBasis`
- **Fine-grained control**: Precise alignment and distribution of child elements

### When to Use Native Stacks

Choose native VStack/HStack (without `layout="flex"`) when you need:

- **Simple layouts**: Basic vertical or horizontal stacking
- **Maximum performance**: Native SwiftUI stacks for straightforward use cases
- **SwiftUI-specific features**: Properties like `firstTextBaseline` alignment

## Flexbox Properties Reference

### Container Properties

Set these properties on the flexbox container (View, VStack with `layout="flex"`, or HStack with `layout="flex"`):

#### flexDirection

Controls the main axis direction:

- `'column'` (default): Vertical layout, children stack top to bottom
- `'row'`: Horizontal layout, children stack left to right

```tsx
<Voltra.View style={{ flexDirection: 'row' }}>
  <Voltra.Text>First</Voltra.Text>
  <Voltra.Text>Second</Voltra.Text>
</Voltra.View>
```

#### alignItems

Controls cross-axis alignment (perpendicular to main axis):

- `'flex-start'`: Align to the start of the cross axis
- `'center'`: Center on the cross axis
- `'flex-end'`: Align to the end of the cross axis
- `'stretch'` (default): Stretch to fill the cross axis

```tsx
<Voltra.View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Voltra.Text>Vertically centered</Voltra.Text>
</Voltra.View>
```

#### justifyContent

Controls main-axis distribution (along the main axis):

- `'flex-start'` (default): Pack items at the start
- `'center'`: Center items
- `'flex-end'`: Pack items at the end
- `'space-between'`: First item at start, last at end, equal space between
- `'space-around'`: Equal space around each item
- `'space-evenly'`: Exactly equal space everywhere

```tsx
<Voltra.View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
  <Voltra.Text>Left</Voltra.Text>
  <Voltra.Text>Right</Voltra.Text>
</Voltra.View>
```

#### gap

Spacing between children along the main axis (in points):

```tsx
<Voltra.View style={{ flexDirection: 'row', gap: 16 }}>
  <Voltra.Text>Item 1</Voltra.Text>
  <Voltra.Text>Item 2</Voltra.Text>
  <Voltra.Text>Item 3</Voltra.Text>
</Voltra.View>
```

:::note One-Axis Gap
The `gap` property applies spacing along the main axis only (the direction of `flexDirection`). Unlike CSS Grid, there is no separate `columnGap` or `rowGap`. The gap is always applied between children in the flex direction.
:::

### Child Properties

Set these properties on children inside a flexbox container:

#### flex

Shorthand for `flexGrow` and `flexShrink`:

```tsx
<Voltra.View style={{ flexDirection: 'row' }}>
  <Voltra.View style={{ flex: 1, backgroundColor: '#3B82F6' }} />
  <Voltra.View style={{ flex: 1, backgroundColor: '#10B981' }} />
</Voltra.View>
```

#### flexGrow

Controls how much an item should grow relative to siblings (default: 0):

```tsx
<Voltra.View style={{ flexDirection: 'row' }}>
  <Voltra.View style={{ flexGrow: 1, backgroundColor: '#3B82F6' }} />
  <Voltra.View style={{ flexGrow: 2, backgroundColor: '#10B981' }} />
</Voltra.View>
```

The second item grows twice as much as the first.

#### flexShrink

Controls how much an item should shrink relative to siblings (default: 0):

```tsx
<Voltra.View style={{ flexDirection: 'row' }}>
  <Voltra.View style={{ flexShrink: 1, width: 200 }} />
  <Voltra.View style={{ flexShrink: 2, width: 200 }} />
</Voltra.View>
```

#### flexBasis

Sets the initial size before flex grow/shrink:

```tsx
<Voltra.View style={{ flexDirection: 'row' }}>
  <Voltra.View style={{ flexBasis: 100, flexGrow: 1 }} />
  <Voltra.View style={{ flexBasis: 200, flexGrow: 1 }} />
</Voltra.View>
```

#### alignSelf

Override the parent's `alignItems` for a specific child:

```tsx
<Voltra.View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
  <Voltra.Text>Top aligned</Voltra.Text>
  <Voltra.Text style={{ alignSelf: 'center' }}>Center aligned</Voltra.Text>
</Voltra.View>
```

#### Sizing Properties

Standard sizing properties work on flexbox children:

- `width`, `height`: Fixed dimensions
- `minWidth`, `maxWidth`: Minimum/maximum width constraints
- `minHeight`, `maxHeight`: Minimum/maximum height constraints
- `margin`: Outer spacing
- `padding`: Inner spacing

## Understanding Axes

Flexbox operates on two axes:

### Main Axis

The main axis is determined by `flexDirection`:

- `flexDirection: 'row'` → **horizontal** main axis (left to right)
- `flexDirection: 'column'` → **vertical** main axis (top to bottom)

Use `justifyContent` to control distribution along the main axis.

### Cross Axis

The cross axis is perpendicular to the main axis:

- `flexDirection: 'row'` → **vertical** cross axis (top to bottom)
- `flexDirection: 'column'` → **horizontal** cross axis (left to right)

Use `alignItems` to control alignment along the cross axis.

```tsx
// Row: main = horizontal, cross = vertical
<Voltra.View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
  <Voltra.Text>Centered horizontally (main) and vertically (cross)</Voltra.Text>
</Voltra.View>

// Column: main = vertical, cross = horizontal
<Voltra.View style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
  <Voltra.Text>Centered vertically (main) and horizontally (cross)</Voltra.Text>
</Voltra.View>
```

## JustifyContent Spacing Modes

The `justifyContent` property offers powerful spacing modes:

### space-between

First item at the start, last item at the end, equal space between items:

```tsx
<Voltra.View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
  <Voltra.Text>Left</Voltra.Text>
  <Voltra.Text>Middle</Voltra.Text>
  <Voltra.Text>Right</Voltra.Text>
</Voltra.View>
```

Result: `[Left]     [Middle]     [Right]`

### space-around

Equal space around each item (edges get half the space):

```tsx
<Voltra.View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 16 }}>
  <Voltra.Text>One</Voltra.Text>
  <Voltra.Text>Two</Voltra.Text>
  <Voltra.Text>Three</Voltra.Text>
</Voltra.View>
```

Result: `  [One]    [Two]    [Three]  `

### space-evenly

Exactly equal space everywhere (including edges):

```tsx
<Voltra.View style={{ flexDirection: 'row', justifyContent: 'space-evenly', padding: 16 }}>
  <Voltra.Text>One</Voltra.Text>
  <Voltra.Text>Two</Voltra.Text>
  <Voltra.Text>Three</Voltra.Text>
</Voltra.View>
```

Result: `   [One]   [Two]   [Three]   `

## Flex Grow, Shrink, and Basis

### Equal Distribution

Give all items `flex: 1` to distribute space equally:

```tsx
<Voltra.View style={{ flexDirection: 'row', height: 200 }}>
  <Voltra.View style={{ flex: 1, backgroundColor: '#3B82F6' }} />
  <Voltra.View style={{ flex: 1, backgroundColor: '#10B981' }} />
  <Voltra.View style={{ flex: 1, backgroundColor: '#F59E0B' }} />
</Voltra.View>
```

Each item takes exactly 1/3 of the available width.

### Proportional Distribution

Use different `flexGrow` values for proportional sizing:

```tsx
<Voltra.View style={{ flexDirection: 'row', height: 200 }}>
  <Voltra.View style={{ flexGrow: 1, backgroundColor: '#3B82F6' }} />
  <Voltra.View style={{ flexGrow: 2, backgroundColor: '#10B981' }} />
  <Voltra.View style={{ flexGrow: 1, backgroundColor: '#F59E0B' }} />
</Voltra.View>
```

First item gets 1/4 of space, middle gets 2/4 (half), last gets 1/4.

### Fixed and Flexible Items

Combine fixed sizes with flexible items:

```tsx
<Voltra.View style={{ flexDirection: 'column', height: 600 }}>
  {/* Fixed header */}
  <Voltra.View style={{ height: 60, backgroundColor: '#1F2937' }}>
    <Voltra.Text style={{ color: '#FFFFFF', padding: 16 }}>Header</Voltra.Text>
  </Voltra.View>

  {/* Flexible content */}
  <Voltra.View style={{ flexGrow: 1, backgroundColor: '#F3F4F6', padding: 16 }}>
    <Voltra.Text>This content area grows to fill available space</Voltra.Text>
  </Voltra.View>

  {/* Fixed footer */}
  <Voltra.View style={{ height: 80, backgroundColor: '#1F2937' }}>
    <Voltra.Text style={{ color: '#FFFFFF', padding: 16 }}>Footer</Voltra.Text>
  </Voltra.View>
</Voltra.View>
```

## Complete Examples

### Header with Left and Right Content

```tsx
<Voltra.View
  style={{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F2937'
  }}
>
  <Voltra.Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
    My App
  </Voltra.Text>
  <Voltra.Button title="Settings" />
</Voltra.View>
```

### Evenly Spaced Buttons

```tsx
<Voltra.View
  style={{
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 24,
    backgroundColor: '#FFFFFF'
  }}
>
  <Voltra.Button title="Cancel" />
  <Voltra.Button title="Save" />
  <Voltra.Button title="Submit" />
</Voltra.View>
```

### Flexible Middle Section

```tsx
<Voltra.View style={{ flexDirection: 'column', height: 800 }}>
  {/* Header */}
  <Voltra.View
    style={{
      height: 60,
      backgroundColor: '#3B82F6',
      justifyContent: 'center',
      alignItems: 'center'
    }}
  >
    <Voltra.Text style={{ color: '#FFFFFF', fontSize: 20 }}>Header</Voltra.Text>
  </Voltra.View>

  {/* Scrollable content area */}
  <Voltra.ScrollView style={{ flexGrow: 1, backgroundColor: '#F9FAFB' }}>
    <Voltra.View style={{ padding: 16 }}>
      <Voltra.Text>Content goes here and can scroll</Voltra.Text>
    </Voltra.View>
  </Voltra.ScrollView>

  {/* Footer */}
  <Voltra.View
    style={{
      height: 80,
      backgroundColor: '#1F2937',
      justifyContent: 'center',
      alignItems: 'center'
    }}
  >
    <Voltra.Button title="Action" />
  </Voltra.View>
</Voltra.View>
```

### Dynamic Direction

```tsx
export function ResponsiveLayout() {
  const [isLandscape, setIsLandscape] = React.useState(false);

  return (
    <Voltra.View
      style={{
        flexDirection: isLandscape ? 'row' : 'column',
        justifyContent: 'space-between',
        padding: 16
      }}
    >
      <Voltra.View style={{ flex: 1, backgroundColor: '#3B82F6', margin: 8 }} />
      <Voltra.View style={{ flex: 1, backgroundColor: '#10B981', margin: 8 }} />
      <Voltra.View style={{ flex: 1, backgroundColor: '#F59E0B', margin: 8 }} />
    </Voltra.View>
  );
}
```

### Card Layout with Mixed Alignment

```tsx
<Voltra.View
  style={{
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 8
  }}
>
  {/* Header row */}
  <Voltra.View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    }}
  >
    <Voltra.Text style={{ fontSize: 18, fontWeight: 'bold' }}>Card Title</Voltra.Text>
    <Voltra.Symbol name="ellipsis.circle" tintColor="#6B7280" />
  </Voltra.View>

  {/* Content */}
  <Voltra.View style={{ marginBottom: 16 }}>
    <Voltra.Text style={{ color: '#6B7280' }}>
      This is the card content with some descriptive text.
    </Voltra.Text>
  </Voltra.View>

  {/* Action buttons */}
  <Voltra.View
    style={{
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center'
    }}
  >
    <Voltra.Button title="Cancel" />
    <Voltra.View style={{ width: 8 }} />
    <Voltra.Button title="Confirm" />
  </Voltra.View>
</Voltra.View>
```

## Differences from React Native

While Voltra's flexbox is inspired by React Native, there are some key differences:

### Flexbox is Opt-In

Unlike React Native where all View components use flexbox by default, Voltra requires explicit opt-in:

```tsx
// React Native (flexbox by default)
<View style={{ flexDirection: 'row' }}>
  <Text>Works automatically</Text>
</View>

// Voltra (must opt in)
<Voltra.View style={{ flexDirection: 'row' }}>
  <Voltra.Text>Works with View component</Voltra.Text>
</Voltra.View>

// OR
<Voltra.HStack layout="flex" style={{ justifyContent: 'space-between' }}>
  <Voltra.Text>Works with layout="flex"</Voltra.Text>
</Voltra.HStack>
```

### Gap is One-Axis Only

Voltra supports the `gap` style property, but unlike CSS Grid, it only applies spacing along the main axis (the direction of `flexDirection`):

```tsx
// React Native
<View style={{ gap: 12, rowGap: 16, columnGap: 8 }}>
  <Text>Supports separate row/column gaps</Text>
</View>

// Voltra (one-axis gap only)
<Voltra.View style={{ gap: 12, flexDirection: 'row' }}>
  <Voltra.Text>Gap applies horizontally</Voltra.Text>
</Voltra.View>
```

There is no `columnGap` or `rowGap` - only a single `gap` value that applies between children in the flex direction.

### No Flex Wrap

Voltra does not support `flexWrap`. All flex items are laid out in a single line along the main axis:

```tsx
// React Native
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  <Text>Items</Text>
  <Text>Can</Text>
  <Text>Wrap</Text>
</View>

// Voltra (no wrap support)
<Voltra.View style={{ flexDirection: 'row' }}>
  {/* Items will overflow or shrink, never wrap to next line */}
  <Voltra.Text>All items in one line</Voltra.Text>
</Voltra.View>
```

### No Percentage Dimensions

Voltra does not support percentage-based width or height:

```tsx
// React Native
<View style={{ width: '50%' }}>
  <Text>Half width</Text>
</View>

// Voltra (use flexGrow instead)
<Voltra.View style={{ flexGrow: 1 }}>
  <Voltra.Text>Flexible width</Voltra.Text>
</Voltra.View>
```

### Properties Must Be in style Prop

All flexbox properties must be passed via the `style` prop, not as direct component props:

```tsx
// Correct
<Voltra.View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Voltra.Text>Centered</Voltra.Text>
</Voltra.View>

// Incorrect (won't work)
<Voltra.View flexDirection="row" alignItems="center">
  <Voltra.Text>Won't work</Voltra.Text>
</Voltra.View>
```

### Default alignItems is stretch

Like React Native, the default `alignItems` value is `'stretch'`:

```tsx
<Voltra.View style={{ flexDirection: 'row', height: 100 }}>
  {/* This will stretch to full height */}
  <Voltra.View style={{ width: 50, backgroundColor: '#3B82F6' }} />
</Voltra.View>
```

### Default flexDirection for View is column

Like React Native, View defaults to `flexDirection: 'column'`:

```tsx
<Voltra.View>
  {/* These stack vertically by default */}
  <Voltra.Text>First</Voltra.Text>
  <Voltra.Text>Second</Voltra.Text>
</Voltra.View>
```

## Troubleshooting

### Flexbox properties not working

**Problem:** Setting `flexDirection`, `justifyContent`, or `alignItems` has no effect.

**Solution:** Ensure you've enabled flexbox mode:

```tsx
// ❌ Won't work - flexbox not enabled
<Voltra.VStack style={{ justifyContent: 'space-between' }}>
  <Voltra.Text>Item 1</Voltra.Text>
  <Voltra.Text>Item 2</Voltra.Text>
</Voltra.VStack>

// ✅ Works - flexbox enabled
<Voltra.VStack layout="flex" style={{ justifyContent: 'space-between' }}>
  <Voltra.Text>Item 1</Voltra.Text>
  <Voltra.Text>Item 2</Voltra.Text>
</Voltra.VStack>

// ✅ Also works - View always uses flexbox
<Voltra.View style={{ justifyContent: 'space-between' }}>
  <Voltra.Text>Item 1</Voltra.Text>
  <Voltra.Text>Item 2</Voltra.Text>
</Voltra.View>
```

### Items not growing or shrinking

**Problem:** Items don't respond to available space.

**Solution:** Check `flexGrow` and `flexShrink` values. Default is 0 for both:

```tsx
// ❌ Won't grow - flexGrow defaults to 0
<Voltra.View style={{ flexDirection: 'row', width: 400 }}>
  <Voltra.View style={{ width: 100, backgroundColor: '#3B82F6' }} />
  <Voltra.View style={{ backgroundColor: '#10B981' }} /> {/* Won't fill space */}
</Voltra.View>

// ✅ Grows to fill space
<Voltra.View style={{ flexDirection: 'row', width: 400 }}>
  <Voltra.View style={{ width: 100, backgroundColor: '#3B82F6' }} />
  <Voltra.View style={{ flexGrow: 1, backgroundColor: '#10B981' }} />
</Voltra.View>
```

### Unexpected alignment

**Problem:** Items are aligned differently than expected.

**Solution:** Review main vs. cross axis. Remember that `flexDirection` determines which axis is which:

```tsx
// If you want vertical centering in a row:
<Voltra.View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Voltra.Text>Vertically centered</Voltra.Text>
</Voltra.View>

// If you want horizontal centering in a column:
<Voltra.View style={{ flexDirection: 'column', alignItems: 'center' }}>
  <Voltra.Text>Horizontally centered</Voltra.Text>
</Voltra.View>
```

### Spacing issues

**Problem:** Items aren't spaced as expected.

**Solution:** Understand the difference between `gap` style property and `justifyContent` modes:

```tsx
// gap adds fixed space between items
<Voltra.View style={{ flexDirection: 'row', gap: 16 }}>
  <Voltra.Text>Item 1</Voltra.Text>
  <Voltra.Text>Item 2</Voltra.Text>
</Voltra.View>

// justifyContent distributes items across available space
<Voltra.View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
  <Voltra.Text>Item 1</Voltra.Text>
  <Voltra.Text>Item 2</Voltra.Text>
</Voltra.View>

// You can combine both
<Voltra.View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-evenly' }}>
  <Voltra.Text>Item 1</Voltra.Text>
  <Voltra.Text>Item 2</Voltra.Text>
</Voltra.View>
```

### Items overflowing container

**Problem:** Child items extend beyond the container bounds.

**Solution:** Use `flexShrink` to allow items to shrink, or set explicit size constraints:

```tsx
// ❌ May overflow if content is too wide
<Voltra.View style={{ flexDirection: 'row', width: 300 }}>
  <Voltra.Text>This is a very long text that might overflow</Voltra.Text>
</Voltra.View>

// ✅ Allows shrinking
<Voltra.View style={{ flexDirection: 'row', width: 300 }}>
  <Voltra.Text style={{ flexShrink: 1 }}>
    This is a very long text that will shrink if needed
  </Voltra.Text>
</Voltra.View>
```

## Next Steps

- Explore the [View component documentation](../components/layout#view) for detailed API reference
- Learn about [styling in Voltra](./styling) for more style property options
- Check out the [example app](https://github.com/margelo/voltra/tree/main/example) for more flexbox examples
