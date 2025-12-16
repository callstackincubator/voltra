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
    activityId: `order-${orderId}`,
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

**Hook Options:**

- `activityId`: Unique identifier for the Live Activity
- `autoStart`: Automatically start when component mounts
- `autoUpdate`: Automatically update when variants change
- `deepLinkUrl`: URL to open when Live Activity is tapped

**Hook Returns:**

- `start()`: Start the Live Activity
- `update()`: Update the Live Activity
- `end()`: Stop the Live Activity
- `isActive`: Boolean indicating if the Live Activity is currently active
