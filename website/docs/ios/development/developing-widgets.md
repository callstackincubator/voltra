# Developing Widgets

Voltra provides APIs that make building and testing Home Screen widgets easier during development.

## VoltraWidgetPreview component

For testing and development, Voltra provides a `VoltraWidgetPreview` component that renders Voltra JSX components at the exact dimensions of specific iOS widget families. This is useful for:

- Testing component layouts before deploying to widgets
- Previewing how your widget will look across different sizes
- Developing widget content within your React Native app

```tsx
import { VoltraWidgetPreview } from 'voltra/client'
import { Voltra } from 'voltra'

function MyWidgetPreview() {
  return (
    <Voltra.VStack style={{ padding: 16, backgroundColor: '#101828' }}>
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Weather Widget</Voltra.Text>
      <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Sunny, 72°F</Voltra.Text>
    </Voltra.VStack>
  )
}

// Preview different widget sizes
function WidgetPreviews() {
  return (
    <Voltra.VStack style={{ gap: 20 }}>
      <VoltraWidgetPreview family="systemSmall">
        <MyWidgetPreview />
      </VoltraWidgetPreview>

      <VoltraWidgetPreview family="systemMedium">
        <MyWidgetPreview />
      </VoltraWidgetPreview>

      <VoltraWidgetPreview family="systemLarge">
        <MyWidgetPreview />
      </VoltraWidgetPreview>
    </Voltra.VStack>
  )
}
```

**Props:**

- `family`: Widget family size to preview (systemSmall, systemMedium, systemLarge, etc.)
- `style`: Additional React Native styles to apply
- `id`: Unique identifier for the view (used for event filtering)
- `onInteraction`: Callback for user interactions with buttons/toggles

## updateWidget API

The `updateWidget` function allows you to update home screen widget content with new data.

:::warning
Widget updates are throttled to around an update per minute. iOS limits how frequently widgets can be refreshed to preserve battery life and system performance.
:::

```typescript
import { updateWidget } from 'voltra/client'
import { Voltra } from 'voltra'

await updateWidget('weather', {
  systemSmall: <Voltra.Text>72°F</Voltra.Text>,
  systemMedium: (
    <Voltra.HStack>
      <Voltra.Text>72°F</Voltra.Text>
      <Voltra.VStack>
        <Voltra.Text>Sunny</Voltra.Text>
        <Voltra.Text>High: 78° Low: 65°</Voltra.Text>
      </Voltra.VStack>
    </Voltra.HStack>
  ),
  systemLarge: (
    <Voltra.VStack>
      <Voltra.Text style={{ fontSize: 24 }}>Weather</Voltra.Text>
      <Voltra.Text>72°F - Sunny</Voltra.Text>
      <Voltra.Text>High: 78° Low: 65°</Voltra.Text>
    </Voltra.VStack>
  ),
}, { deepLinkUrl: 'myapp://weather' })
```

**Parameters:**

- `widgetId`: The widget identifier (as defined in your config plugin)
- `variants`: An object mapping widget families to specific content
- `options.deepLinkUrl`: URL to open when the widget is tapped

## Widget configuration via Expo plugin

Widgets are configured through the Voltra Expo config plugin. Add the widget configuration to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "widgets": [
            {
              "id": "weather",
              "displayName": "Weather Widget",
              "description": "Current weather conditions",
              "supportedFamilies": ["systemSmall", "systemMedium", "systemLarge"]
            }
          ]
        }
      ]
    ]
  }
}
```

**Widget Configuration Properties:**

- `id`: Unique identifier for the widget (alphanumeric with underscores only)
- `displayName`: Name shown in the widget gallery
- `description`: Description shown in the widget gallery
- `supportedFamilies`: Array of supported widget sizes (defaults to systemSmall, systemMedium, systemLarge)

## Fallback logic for variants

When a widget size doesn't have specific content defined, Voltra automatically falls back to other available variants in this order:

1. `systemMedium` (preferred fallback for home screen widgets)
2. `systemSmall`
3. `systemLarge`
4. `systemExtraLarge`
5. `accessoryRectangular`
6. `accessoryCircular`
7. `accessoryInline`

This ensures your widget always displays content even when a specific size variant isn't provided. For example, if you only define `systemSmall` and `systemLarge`, a `systemMedium` widget will use the `systemSmall` content.

```typescript
// Only defining systemSmall and systemLarge
await updateWidget('minimal', {
  systemSmall: <Voltra.Text>72°F</Voltra.Text>,
  systemLarge: <Voltra.Text>Weather: 72°F - Sunny</Voltra.Text>,
})

// systemMedium will automatically use systemSmall content as fallback
```

## Additional widget APIs

### reloadWidgets

Force widget timelines to refresh their content after updating shared resources like preloaded images:

```typescript
import { reloadWidgets } from 'voltra/client'

// Reload specific widgets
await reloadWidgets(['weather', 'calendar'])

// Reload all widgets
await reloadWidgets()
```

### clearWidget / clearAllWidgets

Remove stored widget data, causing widgets to show their placeholder state:

```typescript
import { clearWidget, clearAllWidgets } from 'voltra/client'

// Clear specific widget
await clearWidget('weather')

// Clear all widgets
await clearAllWidgets()
```
