# Dynamic Widgets

:::warning Experimental Feature
Dynamic widgets are experimental. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

Dynamic widgets run your widget JSX on device from its own JS bundle. On Android, that bundle runs in standalone Hermes and gets live environment values on every render.

Your widget can react to:

- `env.widgetFamily`
- `env.colorScheme`
- `env.locale`
- `env.configuration`
- `AndroidDynamicColors` tokens, which resolve to the current Material You palette natively

In development, Metro serves the bundle and Fast Refresh updates the pinned widget while you edit. In release builds, Voltra bakes the bundle into the app assets.

## How to use it

1. Create a widget file that exports a named function.
2. Add the `'use voltra'` directive inside that function.
3. Make the exported function name match the widget `id` in `app.json`.
4. Point `initialStatePath` at that file in the Android plugin config.
5. Rebuild the app after `expo prebuild`.

```tsx
import { AndroidDynamicColors, VoltraAndroid, type WidgetEnvironment } from '@use-voltra/android'

export function weather_widget(_props: object, env: WidgetEnvironment = {} as WidgetEnvironment) {
  'use voltra'

  const renderedAt = env.date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <VoltraAndroid.Column
      style={{ width: '100%', height: '100%', padding: 16, backgroundColor: AndroidDynamicColors.surface }}
      verticalAlignment="center-vertically"
    >
      <VoltraAndroid.Text style={{ color: AndroidDynamicColors.onSurface, fontSize: 18 }}>
        Weather Widget
      </VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ color: AndroidDynamicColors.onSurfaceVariant }}>
        Size: {env.widgetFamily}
      </VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ color: AndroidDynamicColors.onSurfaceVariant }}>
        Scheme: {env.colorScheme ?? 'light'}
      </VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ color: AndroidDynamicColors.onSurfaceVariant }}>
        Rendered: {renderedAt}
      </VoltraAndroid.Text>
    </VoltraAndroid.Column>
  )
}
```

Example plugin config:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/android-client",
        {
          "widgets": [
            {
              "id": "weather_widget",
              "displayName": "Weather Widget",
              "description": "A Dynamic Widget widget that reacts to live device state",
              "targetCellWidth": 2,
              "targetCellHeight": 2,
              "initialStatePath": "./widgets/weather_widget.tsx"
            }
          ]
        }
      ]
    ]
  }
}
```

If you need user-controlled values, add `appIntent.parameters` and update them in-app with `setWidgetConfiguration(widgetId, key, value)`.

## Notes

- Keep widget `id` and exported function name identical.
- Use a real device to verify release rendering.
- The file referenced by `initialStatePath` still provides first paint while the JS bundle loads.
