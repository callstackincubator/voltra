# Dynamic Widgets

:::warning Experimental Feature
Dynamic widgets are experimental. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

Dynamic Widgets let your widget react to the current device state on Android. Declare them in `app.json` with a stable `id` and an explicit `entry`, then default-export the widget from that file.

Your widget can react to:

- `env.widgetFamily`
- `env.colorScheme`
- `env.locale`
- `env.configuration`
- `AndroidDynamicColors` tokens, which resolve to the current Material You palette natively

When you change `app.json`, run Expo Prebuild or Voltra Apply so the updated widget configuration is available on device. If you change only the widget JS, reopen the app in development and the widget updates automatically.

## How to use it

1. Add an Android widget declaration to `app.json` with an `id`, an `entry`, and any widget metadata you need.
2. Default-export the widget function or component from the module named by `entry`.
3. Use `initialStatePath` if you want a pre-rendered first view.
4. Re-run Expo Prebuild or Voltra Apply after updating `app.json`.
5. Keep Android and iOS widget declarations separate; the same `id` can exist on both platforms because each platform is configured separately.

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

If you need user-controlled values, add `appIntent.parameters` and update them in-app. See [Configuration](#configuration) below.

## Configuration

Declare the available keys with `appIntent.parameters`, each with an optional `default`. The values are surfaced to your widget as `env.configuration`, and resolve in three layers — later layers win:

1. **Code defaults** — `appIntent.parameters[].default` from `app.json`.
2. **Widget-type values** — shared by every placement of that widget.
3. **Instance values** — scoped to one placed widget, identified by its `appWidgetId`.

Use instance values when two placements of the same widget should show different data — two accounts, two cities, two filters:

```tsx
import {
  getActiveWidgets,
  getWidgetInstanceConfiguration,
  setWidgetInstanceConfiguration,
  clearWidgetInstanceConfiguration,
} from '@use-voltra/android-client'

// Find the placed widgets of a given type.
const widgets = await getActiveWidgets()
const instance = widgets.find((widget) => widget.widgetType === 'weather')

if (instance) {
  // Read what the widget currently sees, to populate your form.
  const current = await getWidgetInstanceConfiguration(instance.appWidgetId)

  // Write one key, or several at once.
  await setWidgetInstanceConfiguration(instance.appWidgetId, 'city', 'Kraków')
  await setWidgetInstanceConfiguration(instance.appWidgetId, { city: 'Kraków', units: 'metric' })

  // Fall back to widget-type and default values.
  await clearWidgetInstanceConfiguration(instance.appWidgetId)
}
```

Prefer the object form when writing several keys: it is one write and one widget re-render, instead of one of each per key.

`setWidgetConfiguration(widgetId, key, value)` still sets a value for every placement of a widget type, and `getWidgetConfiguration(widgetId)` reads that layer merged with the defaults.

:::note
Instance values shadow widget-type values. Once an instance has its own value for a key, `setWidgetConfiguration` no longer changes what that instance displays — the call still succeeds and still updates every other, unconfigured instance. Use `clearWidgetInstanceConfiguration` to hand an instance back to the widget-type value.
:::

An instance's values are removed when the user deletes that widget from the home screen. Android recycles `appWidgetId`s, so this keeps a newly placed widget from inheriting a deleted one's configuration.

Configuration is written from inside your app — Android has no system-provided widget configuration UI equivalent to iOS's, so build a screen for it. `getActiveWidgets` returns the placed instances to choose from.

## Notes

- There is no `export` field in app.json for Dynamic Widgets.
- The default-exported function or component name does not need to match the widget `id`.
- Use a real device to verify release rendering.
- `initialStatePath` gives the widget a pre-rendered first view.
