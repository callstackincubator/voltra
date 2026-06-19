# Dynamic Widgets

:::warning Experimental Feature
Dynamic widgets are experimental. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

Dynamic Widgets run your widget JSX on device from its own JS bundle. You declare them in `app.json` with a stable `id` and an explicit `entry`, Expo prebuild writes `.voltra/manifest.android.json`, and Metro reads that manifest to bundle only the widgets you declared.

Your widget can react to:

- `env.widgetFamily`
- `env.colorScheme`
- `env.locale`
- `env.configuration`
- `AndroidDynamicColors` tokens, which resolve to the current Material You palette natively

In development, Metro serves the bundle and Fast Refresh updates the pinned widget while you edit. In release builds, Voltra bakes the bundle into the app assets.

## How to use it

1. Add an Android widget declaration to `app.json` with an `id`, an `entry`, and any widget metadata you need.
2. Default-export the widget function or component from the module named by `entry`.
3. Use `initialStatePath` if you want a pre-rendered first paint while the JS bundle loads.
4. Rebuild the app after `expo prebuild`.
5. Keep Android and iOS widget declarations separate; the same `id` can exist on both platforms because each platform writes its own manifest.

```tsx
import { AndroidDynamicColors, VoltraAndroid, type WidgetEnvironment } from '@use-voltra/android'

export default function WeatherWidget(_props: object, env: WidgetEnvironment = {} as WidgetEnvironment) {

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
              "entry": "./widgets/android/weather-widget.tsx",
              "displayName": "Weather Widget",
              "description": "A Dynamic Widget that reacts to live device state",
              "targetCellWidth": 2,
              "targetCellHeight": 2,
              "initialStatePath": "./widgets/android/weather-widget.tsx"
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

- There is no `export` field in app.json for Dynamic Widgets.
- The default-exported function or component name does not need to match the widget `id`.
- Use a real device to verify release rendering.
- The file referenced by `initialStatePath` still provides first paint while the JS bundle loads.
