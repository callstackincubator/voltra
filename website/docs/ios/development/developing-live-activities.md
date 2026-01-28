# Developing Live Activities

Voltra provides APIs that make building and testing Live Activities easier during development.

## Supported variants

Live Activities in iOS can appear in different contexts, and Voltra supports defining UI variants for each of these contexts. For detailed information about Live Activity design guidelines, see the [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/live-activities).

### Lock Screen

The `lockScreen` variant defines how your Live Activity appears on the lock screen. It can be either a ReactNode directly, or an object with content and optional styling:

```typescript
const variants = {
  lockScreen: (
    <Voltra.VStack>
      <Voltra.Text>Your content here</Voltra.Text>
    </Voltra.VStack>
  ),
}
```

### Dynamic Island

The `island` variant defines how your Live Activity appears in the Dynamic Island (available on iPhone 14 Pro and later). The Dynamic Island has three display states:

- **Minimal**: A compact pill-shaped view that appears when the activity is in the background
- **Compact**: A slightly larger view with leading and trailing regions
- **Expanded**: A full-width view with center, leading, trailing, and bottom regions

```typescript
const variants = {
  island: {
    keylineTint: '#10B981', // Optional tint color for the Dynamic Island keyline
    minimal: <Voltra.Symbol name="checkmark.circle.fill" tintColor="#10B981" />,
    compact: {
      leading: <Voltra.Text>Order</Voltra.Text>,
      trailing: <Voltra.Text>Confirmed</Voltra.Text>,
    },
    expanded: {
      center: <Voltra.Text style={{ fontSize: 16, fontWeight: '600' }}>Order Confirmed</Voltra.Text>,
      leading: <Voltra.Symbol name="checkmark.circle.fill" />,
      trailing: <Voltra.Text>ETA: 15 min</Voltra.Text>,
      bottom: <Voltra.Text style={{ fontSize: 12 }}>Your order is being prepared</Voltra.Text>,
    },
  },
}
```

### Supplemental Activity Families (iOS 18+, watchOS 11+)

The `supplementalActivityFamilies` variant defines how your Live Activity appears on Apple Watch Smart Stack and CarPlay displays. This variant is optional and works seamlessly with your existing lock screen and Dynamic Island variants.

```typescript
const variants = {
  lockScreen: (
    <Voltra.VStack>
      {/* iPhone lock screen content */}
    </Voltra.VStack>
  ),
  island: {
    /* Dynamic Island variants for iPhone */
  },
  supplementalActivityFamilies: {
    small: (
      <Voltra.HStack style={{ padding: 12, gap: 8 }}>
        <Voltra.Text style={{ fontSize: 18, fontWeight: '700' }}>12 min</Voltra.Text>
        <Voltra.Text style={{ fontSize: 14, color: '#9CA3AF' }}>ETA</Voltra.Text>
      </Voltra.HStack>
    ),
  },
}
```

If `supplementalActivityFamilies.small` is not provided, Voltra will automatically construct it from your Dynamic Island `compact` variant by combining the leading and trailing content in an HStack.

## useLiveActivity

For React development, Voltra provides the `useLiveActivity` hook for integration with the component lifecycle and automatic updates during development.

:::warning
Unfortunately, iOS suspends background apps after approximately 30 seconds. This means that if you navigate away from your app (for example, to check the Dynamic Island or lock screen), live reload and auto-update functionality will be paused.
:::

```typescript
import { useLiveActivity } from 'voltra/client'
import { Voltra } from 'voltra'

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

  const { start, update, end, isActive } = useLiveActivity(variants, {
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
import { VoltraView } from 'voltra/client'
import { Voltra } from 'voltra'

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
        <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Test Live Activity</Voltra.Text>
        <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>This is how it will look</Voltra.Text>
        <Voltra.Button id="test-button" style={{ marginTop: 12 }}>
          <Voltra.Text>Test Button</Voltra.Text>
        </Voltra.Button>
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
```
