# Supplemental Activity Families

Starting with iOS 18, Live Activities can appear on additional surfaces beyond the iPhone lock screen and Dynamic Island:

- **watchOS Smart Stack** (iOS 18+) - Appears on paired Apple Watch
- **CarPlay Dashboard** (iOS 26+) - Appears on CarPlay displays

Voltra supports the `.small` supplemental activity family, which enables your Live Activities to appear on these new surfaces.

## Enabling supplemental activity families

To enable supplemental activity families, add the `liveActivity` configuration to your plugin:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "groupIdentifier": "group.com.example",
          "liveActivity": {
            "supplementalActivityFamilies": ["small"]
          }
        }
      ]
    ]
  }
}
```

:::warning
This is an opt-in feature. Only include `"small"` if you want your Live Activities to appear on watchOS Smart Stack.
:::

## Providing supplemental activity families content

Use the `supplementalActivityFamilies.small` property in your variants to provide a compact layout optimized for watch and car surfaces:

```tsx
import { useLiveActivity } from 'voltra/client'
import { Voltra } from 'voltra'

function DeliveryActivity({ orderId, eta }) {
  const { start, update, end } = useLiveActivity(
    {
      // Full lock screen UI
      lockScreen: (
        <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
          <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Order #{orderId}</Voltra.Text>
          <Voltra.Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 8 }}>
            Driver en route - ETA {eta} min
          </Voltra.Text>
          {/* Full map or detailed progress would go here */}
        </Voltra.VStack>
      ),

      // Dynamic Island variants
      island: {
        compact: {
          leading: <Voltra.Symbol name="car.fill" tintColor="#10B981" />,
          trailing: <Voltra.Text style={{ fontSize: 14 }}>{eta} min</Voltra.Text>,
        },
        minimal: <Voltra.Symbol name="car.fill" tintColor="#10B981" />,
      },

      // Supplemental activity families for watchOS Smart Stack (iOS 18+)
      supplementalActivityFamilies: {
        small: (
          <Voltra.HStack style={{ padding: 12, gap: 8 }}>
            <Voltra.Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981' }}>{eta} min</Voltra.Text>
            <Voltra.Text style={{ fontSize: 14, color: '#9CA3AF' }}>En route</Voltra.Text>
          </Voltra.HStack>
        ),
      },
    },
    {
      activityName: `delivery-${orderId}`,
    }
  )

  return null
}
```

## Fallback behavior

If you enable `supplementalActivityFamilies: ["small"]` in your plugin config but don't provide a `supplementalActivityFamilies.small` variant in your `useLiveActivity` call, the system will automatically fall back to using your `lockScreen` content.

This allows you to:

1. Enable the capability once in your plugin config
2. Gradually add `supplementalActivityFamilies.small` variants only where needed

## Design guidelines

When designing for `supplementalActivityFamilies.small`, keep these guidelines in mind:

### Keep it minimal

Watch surfaces have very limited space. Show only the most essential information - typically 1-2 key metrics.

```tsx
// Good: Essential information only
supplementalActivityFamilies: {
  small: <Voltra.HStack style={{ gap: 8 }}>
    <Voltra.Text style={{ fontSize: 20, fontWeight: '700' }}>12 min</Voltra.Text>
    <Voltra.Text style={{ fontSize: 14, color: '#9CA3AF' }}>ETA</Voltra.Text>
  </Voltra.HStack>
}

// Avoid: Too much detail for watch display
supplementalActivityFamilies: {
  small: <Voltra.VStack>
    <Voltra.Text>Order #12345</Voltra.Text>
    <Voltra.Text>Driver: John Smith</Voltra.Text>
    <Voltra.Text>ETA: 12 minutes</Voltra.Text>
    <Voltra.Text>Distance: 2.3 miles</Voltra.Text>
  </Voltra.VStack>
}
```

### Use large, legible text

Smaller fonts are hard to read at a glance on a watch. Use larger font sizes and bold weights for key information.

```tsx
<Voltra.Text
  style={{
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  }}
>
  25:42
</Voltra.Text>
```

### High contrast

Ensure your content is readable in various lighting conditions by using high-contrast color combinations.

### No interactive elements

Unlike lock screen, supplemental activity families views are for quick glances only. Avoid buttons or toggles - users cannot interact with them on the watch.

## iOS version requirements

| Feature             | Minimum iOS Version |
| ------------------- | ------------------- |
| watchOS Smart Stack | iOS 18.0            |
| CarPlay Dashboard   | iOS 26.0            |

Live Activities on devices running iOS 16.2-17.x will continue to work normally on the iPhone lock screen and Dynamic Island. The supplemental activity families content is simply ignored on older versions.

## How it works

When you configure `supplementalActivityFamilies`, the Voltra plugin generates a widget wrapper that applies Apple's `.supplementalActivityFamilies()` modifier with an iOS 18 availability check:

```swift
// Generated by Voltra config plugin
struct VoltraWidgetWithSupplementalActivityFamilies: Widget {
  private let wrapped = VoltraWidget()

  var body: some WidgetConfiguration {
    if #available(iOS 18.0, *) {
      return wrapped.body.supplementalActivityFamilies([.small])
    } else {
      return wrapped.body
    }
  }
}
```

The Swift side uses the `@Environment(\.activityFamily)` property to detect whether content is being displayed on a `.small` (watchOS/CarPlay) or `.medium` (iPhone lock screen) surface, automatically choosing the appropriate content.

## API reference

### Plugin configuration

```typescript
interface LiveActivityConfig {
  supplementalActivityFamilies?: 'small'[]
}
```

### TypeScript variants

```typescript
interface LiveActivityVariants {
  lockScreen: ReactNode | LockScreenConfig
  island?: DynamicIslandConfig
  /**
   * Supplemental families for iOS 18+ (watchOS Smart Stack, CarPlay)
   */
  supplementalActivityFamilies?: {
    /**
     * Compact view for watchOS Smart Stack and CarPlay
     * Falls back to lockScreen content if not provided
     */
    small?: ReactNode
  }
}
```

## Related resources

- [Developing Live Activities](/development/developing-live-activities) - General Live Activity development
- [Plugin Configuration](/api/plugin-configuration) - Full plugin configuration reference
- [Apple: Configuring supplemental activity families](<https://developer.apple.com/documentation/activitykit/activityconfiguration/supplementalactivityfamilies(_:)>)
- [WWDC24: What's new in Live Activities](https://developer.apple.com/videos/play/wwdc2024/10068/)
