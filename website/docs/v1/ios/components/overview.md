# Components Overview (iOS)

Voltra provides SwiftUI primitives with JSX bindings, allowing developers to create rich, interactive Live Activities using React/JSX syntax. These components connect web development workflows with native iOS Live Activity rendering.

## Getting Started

All Voltra components are available through the main `Voltra` namespace:

```tsx
import Voltra from 'voltra'

const MyComponent = () => {
  // Use any component
  return (
    <Voltra.VStack spacing={8}>
      <Voltra.Text>Hello Live Activity!</Voltra.Text>
      <Voltra.Button>
        <Voltra.Text>Tap me</Voltra.Text>
      </Voltra.Button>
    </Voltra.VStack>
  )
}
```

## Component Categories

Voltra organizes its components into categories:

### Layout & Containers

Components that arrange other elements or provide structural grouping. These include stacks (VStack, HStack, ZStack), spacers, and container components like GroupBox and GlassContainer.

[See all layout & container components →](./layout)

### Visual Elements & Typography

Static or decorative elements used to display content. This category includes Text, Label, Image, Symbol, and visual effects like LinearGradient, Mask, and Divider.

[See all visual elements & typography components →](./visual)

### Data Visualization & Status

Components for displaying data and status information. This includes progress indicators (LinearProgressView, CircularProgressView), gauges, and timers for showing dynamic information in Live Activities.

[See all data visualization & status components →](./status)

### Interactive Controls & Navigation

User interface controls that respond to user interaction and navigation. This category includes Button and Toggle components for interactive Live Activities, plus Link for semantic URL navigation.

[See all interactive control & navigation components →](./interactive)
