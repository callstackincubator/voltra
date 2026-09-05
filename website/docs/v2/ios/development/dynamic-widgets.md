# Dynamic Widgets

:::warning Experimental Feature
Dynamic Widgets are experimental. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

Dynamic Widgets run their entry component on-device and can react to both app-supplied runtime props and current device state on iOS. Declare a Dynamic Widget in `app.json` with a stable `id` and an explicit `entry`, then default-export the Dynamic Widget from that file.

That means your Dynamic Widget can react to:

- `env.widgetFamily`
- `env.colorScheme`
- `env.locale`
- `env.widgetRenderingMode`
- `env.showsWidgetContainerBackground`
- `env.configuration` when you also add widget parameters

When you change `app.json`, run Expo Prebuild or Voltra Apply so the updated widget configuration is available on device. If you change only the widget JS, reopen the app in development and the widget updates automatically.

## Set up Metro

Dynamic Widgets require `@use-voltra/metro` in the app project. Install it alongside the iOS packages:

```sh
npm install @use-voltra/metro
```

Wrap the app's existing Metro config with `withVoltra`:

```js title="metro.config.js"
const { getDefaultConfig } = require('expo/metro-config')
const { withVoltra } = require('@use-voltra/metro')

const config = getDefaultConfig(__dirname)

module.exports = withVoltra(config)
```

## How to use it

1. Add an iOS widget declaration to `app.json` with an `id`, an `entry`, and any widget metadata you need.
2. Default-export the widget function or component from the module named by `entry`.
3. Use `initialStatePath` if you want a pre-rendered first view.
4. Re-run Expo Prebuild or Voltra Apply after updating `app.json`.
5. Keep iOS and Android widget declarations separate; the same `id` can exist on both platforms because each platform is configured separately.

```tsx
import { Voltra, type WidgetEnvironment } from '@use-voltra/ios'

type WeatherDynamicWidgetProps = {
  headline?: string
  unreadCount?: number
}

export default function WeatherDynamicWidget(
  props: WeatherDynamicWidgetProps = {},
  env: WidgetEnvironment = {} as WidgetEnvironment
) {
  const headline = props.headline ?? 'Weather update'
  const unreadCount = props.unreadCount ?? 0

  const renderedAt = (env.date ? new Date(env.date) : new Date()).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Voltra.VStack style={{ padding: 16, backgroundColor: '#111827' }}>
      <Voltra.Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
        {headline}
      </Voltra.Text>
      <Voltra.Text style={{ color: '#34D399', marginTop: 6 }}>{unreadCount} unread</Voltra.Text>
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
          "groupIdentifier": "group.com.example.app",
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

`groupIdentifier` is required when using runtime props because the app and WidgetKit extension exchange the latest props through the shared App Group. Environment-only Dynamic Widgets can omit it.

After changing the plugin configuration, rebuild the native iOS app. You also need a native rebuild after upgrading to a version of `@use-voltra/ios-client` that introduces a new native API.

## Update Dynamic Widget props

Call `updateDynamicWidget` from your app. The object is serialized, persisted, and passed as the first argument to the entry component on each subsequent render. The update re-renders every installed instance with the matching Dynamic Widget id.

```ts
import { updateDynamicWidget } from '@use-voltra/ios-client'

await updateDynamicWidget('weather_widget', {
  headline: 'Rain arriving soon',
  unreadCount: 2,
})
```

Dynamic Widget props must be JSON-serializable. You can use strings, numbers, booleans, `null`, arrays, and nested objects. Functions, `undefined`, `Date`, `BigInt`, and cyclic references are not supported.

Before the first call to `updateDynamicWidget`, the entry component receives `{}`. The latest props object is persisted by Dynamic Widget id, survives app process restarts, and is reused until a later call replaces it or the app's data is cleared.

:::warning Choose the API by widget type
`updateDynamicWidget` updates an entry-based Dynamic Widget by passing runtime props to its entry component. The legacy `updateWidget` API sends pre-rendered variant payloads to a payload-driven widget and cannot update an entry-based Dynamic Widget.
:::

## Fetching props from a server

Props do not have to come from the app. Add a `serverUpdate` alongside `entry` and the widget fetches a JSON object on a schedule and renders it, without the app running:

```json
{
  "id": "portfolio",
  "entry": "./widgets/ios/portfolio.tsx",
  "serverUpdate": {
    "url": "https://api.example.com/widgets/portfolio",
    "intervalMinutes": 30
  }
}
```

The response object becomes the same first argument `updateDynamicWidget` passes, so the entry component does not change. Because the server returns data rather than a rendered payload, the backend can be written in any language.

`updateDynamicWidget` keeps working on a server-driven widget — the next fetch simply overwrites what you wrote. See [Server-driven widgets](./server-driven-widgets) for the response contract, the `env.serverUpdate` fields, and how to take a widget over.

## Runtime props and configuration are separate

Dynamic Widget props are app-owned state passed as the entry component's first argument. Configuration values are declared through `appIntent.parameters`, edited by the user in the native iOS Edit Widget sheet, and read from `env.configuration`. Updating runtime props does not replace configuration.

If you want user-editable values, add `appIntent` too. See [Configurable Widgets](./configurable-widgets).

## Notes

- There is no `export` field in app.json for Dynamic Widgets.
- The default-exported function or component name does not need to match the widget `id`.
- Use a real device to verify release rendering.
- `initialStatePath` gives the widget a pre-rendered first view.
