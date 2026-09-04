# Dynamic Widgets

:::warning Experimental Feature
Dynamic Widgets are experimental. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

Dynamic Widgets run their entry component on-device and can react to both app-supplied runtime props and current device state. Declare a Dynamic Widget in `app.json` with a stable `id` and an explicit `entry`, then default-export the Dynamic Widget from that file.

Your Dynamic Widget can react to:

- `env.widgetFamily`
- `env.colorScheme`
- `env.locale`
- `env.configuration`
- `AndroidDynamicColors` tokens, which resolve to the current Material You palette natively

When you change `app.json`, run Expo Prebuild or Voltra Apply so the updated Dynamic Widget configuration is available on device. If you change only the Dynamic Widget JS, reopen the app in development and the Dynamic Widget updates automatically.

## Set up Metro

Dynamic Widgets require `@use-voltra/metro` in the app project. Install it alongside the Android packages:

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

1. Add an Android Dynamic Widget declaration to `app.json` with an `id`, an `entry`, and any Dynamic Widget metadata you need.
2. Default-export the Dynamic Widget function or component from the module named by `entry`.
3. Use `initialStatePath` if you want a pre-rendered first view.
4. Re-run Expo Prebuild or Voltra Apply after updating `app.json`.
5. Keep Android and iOS Dynamic Widget declarations separate; the same `id` can exist on both platforms because each platform is configured separately.

```tsx
// widgets/android/inbox-widget.tsx
import { AndroidDynamicColors, VoltraAndroid, type WidgetEnvironment } from '@use-voltra/android'

type InboxDynamicWidgetProps = {
  // Optional because the Dynamic Widget receives {} before its first runtime props update.
  unreadCount?: number
}

type InboxDynamicWidgetConfiguration = {
  label?: string
}

export default function InboxDynamicWidget(
  props: InboxDynamicWidgetProps = {},
  env: WidgetEnvironment<InboxDynamicWidgetConfiguration> = {} as WidgetEnvironment<InboxDynamicWidgetConfiguration>
) {
  const unreadCount = props.unreadCount ?? 0
  const label = env.configuration?.label ?? 'Inbox'

  const renderedAt = (env.date ? new Date(env.date) : new Date()).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <VoltraAndroid.Column
      style={{ width: '100%', height: '100%', padding: 16, backgroundColor: AndroidDynamicColors.surface }}
      verticalAlignment="center-vertically"
    >
      <VoltraAndroid.Text style={{ color: AndroidDynamicColors.onSurface, fontSize: 18 }}>{label}</VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ color: AndroidDynamicColors.primary, fontSize: 24 }}>
        {unreadCount} unread
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
              "id": "inbox_widget",
              "entry": "./widgets/android/inbox-widget.tsx",
              "displayName": "Inbox Widget",
              "description": "A Dynamic Widget with runtime props and live device state",
              "targetCellWidth": 2,
              "targetCellHeight": 2,
              "initialStatePath": "./widgets/android/inbox-widget.tsx",
              "appIntent": {
                "parameters": [
                  {
                    "name": "label",
                    "title": "Label",
                    "default": "Inbox"
                  }
                ]
              }
            }
          ]
        }
      ]
    ]
  }
}
```

After changing the plugin configuration, rebuild the native Android app. You also need a native rebuild after upgrading to a version of `@use-voltra/android-client` that introduces a new native API.

## Update Dynamic Widget props

Call `updateAndroidDynamicWidget` from your app. The object is serialized, persisted, and passed as the first argument to the entry component on each subsequent render. The update re-renders every installed instance with the matching Dynamic Widget id.

```ts
import { updateAndroidDynamicWidget } from '@use-voltra/android-client'

await updateAndroidDynamicWidget('inbox_widget', {
  unreadCount: 7,
})
```

Dynamic Widget props must be JSON-serializable. You can use strings, numbers, booleans, `null`, arrays, and nested objects. Functions, `undefined`, `Date`, `BigInt`, and cyclic references are not supported.

Before the first call to `updateAndroidDynamicWidget`, the entry component receives `{}`. The latest props object is persisted by Dynamic Widget id, survives app process restarts, and is reused until a later call replaces it or the app's data is cleared.

:::warning Choose the API by widget type
`updateAndroidDynamicWidget` updates an entry-based Dynamic Widget by passing runtime props to its entry component. The legacy `updateAndroidWidget` API sends pre-rendered variant payloads to a payload-driven widget and cannot update an entry-based Dynamic Widget. Calling it on a Dynamic Widget now rejects with `VOLTRA_WIDGET_KIND_MISMATCH`, and `updateAndroidDynamicWidget` rejects the same way when called on a payload-driven widget.
:::

## Runtime props and configuration are separate

Dynamic Widget props are app-owned state passed as the entry component's first argument. Configuration values are declared through `appIntent.parameters`, updated in-app with `setWidgetConfiguration(widgetId, key, value)`, and read from `env.configuration`. Updating one does not replace the other.

## Notes

- There is no `export` field in app.json for Dynamic Widgets.
- The default-exported Dynamic Widget function or component name does not need to match the widget `id`.
- Use a real device to verify release rendering.
- `initialStatePath` gives the Dynamic Widget a pre-rendered first view.
