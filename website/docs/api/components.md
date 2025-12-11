# Components

Voltra provides a comprehensive set of components for building Live Activities and Widgets. Components are organized into four main categories: **Layout & Containers**, **Visual Elements & Typography**, **Data Visualization & Status**, and **Interactive Controls**.

## [Layout & Containers](./components/layout)

Components that arrange other elements or provide structural grouping. These include vertical, horizontal, and depth-based stacks, flexible spacing, visual grouping containers, and modern glassmorphism effects.

**Components:** VStack, HStack, ZStack, Spacer, GroupBox, GlassContainer

---

## [Visual Elements & Typography](./components/visual)

Static or decorative elements used to display content. These components handle text rendering, images, system icons (SF Symbols), visual separators, gradients, and glass effects.

**Components:** Text, Label, Image, Symbol, Divider, LinearGradient

---

## [Data Visualization & Status](./components/status)

Components specifically designed to show dynamic values or states over time. Essential for displaying progress, gauges, and timers in Live Activities.

**Components:** LinearProgressView, CircularProgressView, Gauge, Timer

---

## [Interactive Controls](./components/interactive)

The limited set of controls that work via AppIntents in Live Activities. These components allow users to interact with your Live Activity through buttons and toggles.

**Components:** Button, Toggle

---

## Dynamic Island Variants

Live Activities can display different content on the Dynamic Island (available on iOS 16.1+) depending on the island's expansion state. You can customize the appearance for each state by providing different variants.

### Island States

- **Minimal**: The smallest state, shown when space is limited
- **Compact**: The default collapsed state with leading and trailing content
- **Expanded**: The expanded state with center, leading, trailing, and bottom content areas

### Configuration

```tsx
import { startVoltra, Voltra } from 'voltra'

await startVoltra({
  lockScreen: <LockScreenContent />,
  island: {
    keylineTint: '#007AFF', // Optional: Tint color for the island's keyline
    minimal: <MinimalIslandContent />,
    compact: {
      leading: <CompactLeadingContent />,
      trailing: <CompactTrailingContent />,
    },
    expanded: {
      center: <ExpandedCenterContent />,
      leading: <ExpandedLeadingContent />,
      trailing: <ExpandedTrailingContent />,
      bottom: <ExpandedBottomContent />,
    },
  },
})
```

### keylineTint Property

The `keylineTint` property allows you to customize the color of the Dynamic Island's keyline (the outline around the island). This provides visual consistency with your app's branding.

**Supported values:** Any valid CSS color string (hex, rgb, named colors)

**Example:**

```tsx
island: {
  keylineTint: '#FF6B35', // Orange keyline
  // ... other island configuration
}
```

**Note:** The keyline tint is only visible when the Dynamic Island is in its expanded state and has a visible keyline.
