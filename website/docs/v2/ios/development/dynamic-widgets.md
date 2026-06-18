# Dynamic Widgets

:::warning Experimental Feature
Dynamic widgets are experimental. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

Dynamic widgets run your widget JSX on device from its own JS bundle. Instead of shipping only pre-rendered state, the widget render function gets live environment values every time the system draws it.

That means your widget can react to:

- `env.widgetFamily`
- `env.colorScheme`
- `env.locale`
- `env.widgetRenderingMode`
- `env.showsWidgetContainerBackground`
- `env.configuration` when you also add widget parameters

In development, Metro serves the bundle and Fast Refresh updates the widget while you edit. In release builds, Voltra bakes the bundle into the widget extension.

## How to use it

1. Create a widget file that exports a named function.
2. Add the `'use voltra'` directive inside that function.
3. Make the exported function name match the widget `id` in `app.json`.
4. Point `initialStatePath` at that file in the iOS plugin config.
5. Rebuild the app after `expo prebuild`.

```tsx
import { Voltra, type WidgetEnvironment } from '@use-voltra/ios'

export function weather_widget(_props: object, env: WidgetEnvironment = {} as WidgetEnvironment) {
  'use voltra'

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
              "displayName": "Weather Widget",
              "description": "A Dynamic Widget widget that reacts to live device state",
              "supportedFamilies": ["systemSmall", "systemMedium", "systemLarge"],
              "initialStatePath": "./widgets/weather_widget.tsx"
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

- Keep widget `id` and exported function name identical.
- Use a real device to verify release rendering.
- The file referenced by `initialStatePath` still provides first paint while the JS bundle loads.
