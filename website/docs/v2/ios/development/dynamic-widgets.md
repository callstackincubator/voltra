# Dynamic Widgets

:::warning Experimental Feature
Dynamic widgets are experimental. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

Dynamic Widgets run your widget JSX on device from its own JS bundle. You declare them in `app.json` with a stable `id` and an explicit `entry`, Expo prebuild writes `.voltra/manifest.ios.json`, and Metro reads that manifest to bundle only the widgets you declared.

That means your widget can react to:

- `env.widgetFamily`
- `env.colorScheme`
- `env.locale`
- `env.widgetRenderingMode`
- `env.showsWidgetContainerBackground`
- `env.configuration` when you also add widget parameters

In development, Metro serves the bundle and Fast Refresh updates the widget while you edit. In release builds, Voltra bakes the bundle into the widget extension.

## How to use it

1. Add an iOS widget declaration to `app.json` with an `id`, an `entry`, and any widget metadata you need.
2. Default-export the widget function or component from the module named by `entry`.
3. Use `initialStatePath` if you want a pre-rendered first paint while the JS bundle loads.
4. Rebuild the app after `expo prebuild`.
5. Keep iOS and Android widget declarations separate; the same `id` can exist on both platforms because each platform writes its own manifest.

```tsx
import { Voltra, type WidgetEnvironment } from '@use-voltra/ios'

export default function WeatherWidget(_props: object, env: WidgetEnvironment = {} as WidgetEnvironment) {

  const renderedAt = env.date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Voltra.VStack style={{ padding: 16, backgroundColor: '#111827' }}>
      <Voltra.Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
        Weather Widget
      </Voltra.Text>
      <Voltra.Text style={{ color: '#9CA3AF', marginTop: 6 }}>
        Family: {env.widgetFamily}
      </Voltra.Text>
      <Voltra.Text style={{ color: '#9CA3AF' }}>
        Scheme: {env.colorScheme ?? 'light'}
      </Voltra.Text>
      <Voltra.Text style={{ color: '#9CA3AF' }}>
        Rendered: {renderedAt}
      </Voltra.Text>
    </Voltra.VStack>
  )
}
```

Example plugin config:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/ios-client",
        {
          "widgets": [
            {
              "id": "weather_widget",
              "entry": "./widgets/ios/weather-widget.tsx",
              "displayName": "Weather Widget",
              "description": "A Dynamic Widget that reacts to live device state",
              "supportedFamilies": ["systemSmall", "systemMedium", "systemLarge"],
              "initialStatePath": "./widgets/ios/weather-widget.tsx"
            }
          ]
        }
      ]
    ]
  }
}
```

If you want user-editable values, add `appIntent` too. See [Configurable Widgets](./configurable-widgets).

## Notes

- There is no `export` field in app.json for Dynamic Widgets.
- The default-exported function or component name does not need to match the widget `id`.
- Use a real device to verify release rendering.
- The file referenced by `initialStatePath` still provides first paint while the JS bundle loads.
