# Developing Live Activities

Voltra provides APIs that make building and testing Live Activities easier during development.

## useVoltra

For React development, Voltra provides the `useVoltra` hook for integration with the component lifecycle and automatic updates during development.

:::warning
Unfortunately, iOS suspends background apps after approximately 30 seconds. This means that if you navigate away from your app (for example, to check the Dynamic Island or lock screen), live reload and auto-update functionality will be paused.
:::

```typescript
import { useVoltra, Voltra } from 'voltra'

function OrderLiveActivity({ orderId, status }) {
  const variants = {
    lockScreen: (
      <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
        <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>
          {status === 'confirmed' ? 'Order Confirmed' : 'Order Ready'}
        </Voltra.Text>
        <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
          {status === 'confirmed' ? 'Your order is being prepared' : 'Your order is ready for pickup'}
        </Voltra.Text>
        {status === 'ready' && (
          <Voltra.Button onPress="pickup-order" style={{ marginTop: 12 }}>
            I'm Here
          </Voltra.Button>
        )}
      </Voltra.VStack>
    ),
  }

  const { start, update, end, isActive } = useVoltra(variants, {
    activityName: `order-${orderId}`,
    autoStart: true, // Automatically start when component mounts
    autoUpdate: true, // Automatically update when variants change
    deepLinkUrl: `myapp://order/${orderId}`,
  })

  // Manual control if needed
  const handleCancelOrder = async () => {
    await end()
  }

  return (
    <View>
      <Text>Live Activity: {isActive ? 'Active' : 'Inactive'}</Text>
      <Button onPress={handleCancelOrder} title="Cancel Order" />
    </View>
  )
}
```

## VoltraView Component

For testing and development, Voltra provides a `VoltraView` component that renders Voltra JSX components directly in your React Native app. This is useful for:

- Testing component layouts before deploying to Live Activities
- Handling user interactions in development
- Previewing how your Live Activity will look

```tsx
import { VoltraView, Voltra } from 'voltra'

function MyComponent() {
  const handleInteraction = (event: VoltraInteractionEvent) => {
    console.log('User interacted with:', event.identifier)
    console.log('Payload:', event.payload)
  }

  return (
    <VoltraView
      id="my-test-view"
      onInteraction={handleInteraction}
      style={{ height: 200, borderRadius: 12, overflow: 'hidden' }}
    >
      <Voltra.VStack style={{ padding: 16, backgroundColor: '#101828' }}>
        <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>
          Test Live Activity
        </Voltra.Text>
        <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
          This is how it will look
        </Voltra.Text>
        <Voltra.Button title="Test Button" id="test-button" style={{ marginTop: 12 }} />
      </Voltra.VStack>
    </VoltraView>
  )
}
```

**Props:**

- `id`: Unique identifier for the view (used for event filtering)
- `children`: Voltra JSX components to render
- `style`: React Native style for the container
- `onInteraction`: Callback for user interactions with buttons/toggles
```

**Hook Options:**

- `activityName`: Name of the Live Activity
- `autoStart`: Automatically start when component mounts
- `autoUpdate`: Automatically update when variants change
- `deepLinkUrl`: URL to open when Live Activity is tapped

**Hook Returns:**

- `start()`: Start the Live Activity
- `update()`: Update the Live Activity
- `end()`: Stop the Live Activity
- `isActive`: Boolean indicating if the Live Activity is currently active
