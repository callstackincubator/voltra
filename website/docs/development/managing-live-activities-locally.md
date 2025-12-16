# Managing Live Activities locally

Live Activities are dynamic interfaces that display real-time information on iOS devices. Voltra provides a comprehensive set of APIs for managing the complete lifecycle of Live Activities directly from your React Native app, without requiring server-side infrastructure.

## Overview

Managing Live Activities locally involves four main phases:

1. **Starting** a Live Activity with initial content and configuration
2. **Updating** the content and configuration as data changes
3. **Monitoring** state changes and user interactions
4. **Stopping** the Live Activity when it's no longer needed

Voltra offers both imperative APIs for direct control and React hooks for seamless integration with your components.

## Imperative APIs

The imperative APIs provide direct, programmatic control over Live Activities. These are the core functions you'll use to manage Live Activity lifecycles.

### Starting Live Activities

Use `startVoltra()` to create and display a new Live Activity.

```typescript
import { startVoltra, Voltra } from 'voltra'

const variants = {
  lockScreen: (
    <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>
        Order Confirmed
      </Voltra.Text>
      <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
        Your order is being prepared
      </Voltra.Text>
    </Voltra.VStack>
  ),
  // Define compact, minimal, and expanded variants for Dynamic Island
  compact: <Voltra.Text>Order confirmed</Voltra.Text>,
  minimal: <Voltra.Symbol name="checkmark.circle.fill" tintColor="#10B981" />,
  expanded: (
    <Voltra.VStack style={{ padding: 16 }}>
      <Voltra.Text style={{ fontSize: 16, fontWeight: '600' }}>Order Confirmed</Voltra.Text>
      <Voltra.Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
        Your order is being prepared
      </Voltra.Text>
    </Voltra.VStack>
  ),
}

const activityId = await startVoltra(variants, {
  activityId: 'order-123', // Optional: for re-binding on app restart
  deepLinkUrl: 'myapp://order/123', // Optional: URL to open when tapped
  dismissalPolicy: { after: 30 },
  staleDate: Date.now() + 60 * 60 * 1000, // 1 hour
  relevanceScore: 0.8,
})
```

**Parameters:**

- `variants`: A `VoltraVariants` object defining the UI for different display contexts
- `options`: Configuration options (see Configuration Options section below)

**Returns:** A promise that resolves to the Live Activity ID (string)

### Updating Live Activities

Use `updateVoltra()` to modify the content and configuration of an active Live Activity.

```typescript
import { updateVoltra, Voltra } from 'voltra'

const updatedVariants = {
  lockScreen: (
    <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>
        Order Ready
      </Voltra.Text>
      <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
        Your order is ready for pickup
      </Voltra.Text>
      <Voltra.Button onPress="pickup-order" style={{ marginTop: 12 }}>
        I'm Here
      </Voltra.Button>
    </Voltra.VStack>
  ),
  compact: <Voltra.Text>Ready for pickup</Voltra.Text>,
  minimal: <Voltra.Symbol name="bag.fill" tintColor="#F59E0B" />,
}

await updateVoltra(activityId, updatedVariants, {
  dismissalPolicy: { after: 300 }, // 5 minutes
  relevanceScore: 1.0, // High priority now
})
```

**Parameters:**

- `activityId`: The ID returned from `startVoltra()`
- `variants`: Updated UI variants
- `options`: Updated configuration options

### Stopping Live Activities

Use `stopVoltra()` to end a Live Activity.

```typescript
import { stopVoltra } from 'voltra'

await stopVoltra(activityId, {
  dismissalPolicy: { after: 10 }, // Keep visible for 10 seconds after ending
})
```

**Parameters:**

- `activityId`: The ID of the Live Activity to stop
- `options`: Final configuration options

### Checking Live Activity status

Use `isVoltraActive()` to check if a specific Live Activity is currently active.

```typescript
import { isVoltraActive } from 'voltra'

if (isVoltraActive(activityId)) {
  console.log('Live Activity is active')
} else {
  console.log('Live Activity is not active')
}
```

### Utility functions

#### Platform detection

```typescript
import { isGlassSupported, isHeadless } from 'voltra'

// Check if the device supports Liquid Glass (iOS 26+)
if (isGlassSupported()) {
  // Use Liquid Glass features
}

// Check if app was launched in background
if (isHeadless()) {
  // App was launched in background (e.g., from Live Activity interaction)
  // Perform background tasks without UI
}
```

## Development tools

For development-friendly APIs that provide automatic updates and easier testing, see the [Development documentation](./development.md).

## Event handling

Live Activities emit events that you can listen to for state changes and user interactions. See the [Events API documentation](./events.md) for detailed information on subscribing to and handling Live Activity events.

## Configuration options

Voltra provides several configuration options to control Live Activity behavior, lifecycle, and appearance. These options can be used with `startVoltra()`, `updateVoltra()`, and `stopVoltra()`.

### Dismissal policy

Controls how Live Activities behave after they end.

**Options:**

- **`'immediate'`** (default): Live Activity is dismissed immediately when it ends
- **`{ after: number }`**: Live Activity remains visible for the specified number of seconds after ending, then automatically dismisses

**Examples:**

```typescript
// Immediate dismissal (default)
await startVoltra(variants, {
  dismissalPolicy: 'immediate',
})

// Keep visible for 30 seconds after ending
await startVoltra(variants, {
  dismissalPolicy: { after: 30 },
})

// Update dismissal timing for active Live Activities
await updateVoltra(activityId, variants, {
  dismissalPolicy: { after: 300 }, // 5 minutes
})

// Set dismissal timing when stopping
await stopVoltra(activityId, {
  dismissalPolicy: { after: 10 },
})
```

The dismissal policy applies to both programmatic ending and natural ending (when timers expire).

### Stale date

Specifies when a Live Activity should be considered stale and automatically dismissed by iOS.

```typescript
// Dismiss after 1 hour
await startVoltra(variants, {
  staleDate: Date.now() + 60 * 60 * 1000,
})

// Dismiss after 2 hours
await startVoltra(variants, {
  staleDate: Date.now() + 2 * 60 * 60 * 1000,
})
```

**Note:** If you provide a `staleDate` in the past, it will be ignored.

### Relevance score

Helps iOS prioritize which Live Activities to display when space is limited.

**Range:** 0.0 to 1.0 (default: 0.0)

```typescript
// High priority (e.g., active delivery)
await startVoltra(variants, {
  relevanceScore: 0.8,
})

// Low priority (e.g., background task)
await startVoltra(variants, {
  relevanceScore: 0.2,
})
```

Live Activities can receive updates even when your app is in the background or terminated, but they cannot execute JavaScript code. For real-time updates from backgrounded apps, use server-side push notifications.

## Best practices

### Activity lifecycle management

- Always provide meaningful `activityId` values for re-binding on app restart
- Clean up Live Activities when they're no longer relevant
- Use appropriate dismissal policies based on your use case

### Performance considerations

- Keep UI variants lightweight and avoid complex component trees
- Use appropriate relevance scores to ensure important activities are visible
- Set reasonable stale dates to prevent accumulation of outdated activities

### User experience

- Provide deep link URLs for navigation when Live Activities are tapped
- Use meaningful compact and minimal variants for Dynamic Island
- Consider dismissal timing carefully - users may want to see final states
