---
title: "Configurable Widgets"
description: "Let users edit widget parameters in the iOS Edit Widget sheet by adding appIntent parameters to a Dynamic Widget."
---

Configurable widgets let users edit widget parameters in the native iOS Edit Widget sheet. Use them when a Dynamic Widget needs a few user-editable knobs, such as a label, unit, theme, or source.

It requires iOS 17+, because Voltra wires it through `AppIntentConfiguration`.

## How it works

1. Define a Dynamic Widget module with a default export.
2. Add `entry` and `appIntent.parameters` to the widget config in `app.json`.
3. Read the selected values from `env.configuration` in your widget's JSX.
4. Build and install the app on a real iPhone, add the widget to the Home Screen, then long-press it and tap **Edit Widget** to change parameters — your widget re-reads `env.configuration` with the new values.

Each parameter has:

- `name`: key that appears in `env.configuration`
- `title`: label shown in the Edit Widget sheet, as a plain string or a locale map
- `default`: code-defined starting value before the user changes anything
- `dynamicOptions` (optional): `true` to pick from values the app sets at runtime. See [Choices the app sets at runtime](#choices-the-app-sets-at-runtime).
- `options` (optional): fixed values to pick from, each with a `value` and a `title`. The sheet shows a picker with the titles instead of a free-text field, and `env.configuration` receives the `value`. `default` must be one of the values; without a `default`, the first option is used.

## How to use it

```tsx
import { Voltra, type WidgetEnvironment } from '@use-voltra/ios'

type GreetingConfig = { label?: string }

export default function GreetingWidget(
  _props: object,
  env: WidgetEnvironment<GreetingConfig> = {} as WidgetEnvironment<GreetingConfig>
) {

  const label = env.configuration?.label ?? 'Hello'

  return (
    <Voltra.VStack style={{ padding: 16, backgroundColor: '#0F172A' }}>
      <Voltra.Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
        {label}
      </Voltra.Text>
      <Voltra.Text style={{ color: '#94A3B8', marginTop: 6 }}>
        Edit me from the widget sheet.
      </Voltra.Text>
    </Voltra.VStack>
  )
}
```

Plugin config:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/ios-client",
        {
          "widgets": [
            {
              "id": "greeting_widget",
              "entry": "./widgets/ios/greeting-widget.tsx",
              "displayName": "Greeting Widget",
              "description": "A Dynamic Widget with user-editable parameters",
              "supportedFamilies": ["systemSmall", "systemMedium"],
              "initialStatePath": "./widgets/ios/greeting-widget.tsx",
              "appIntent": {
                "parameters": [
                  {
                    "name": "label",
                    "title": "Label",
                    "default": "Hello"
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

If you need more than one value, add more entries to `appIntent.parameters` and read each key from `env.configuration`.

## Offer fixed choices

When a parameter has a known set of values, list them as `options`. The sheet then shows a picker:

```json
{
  "name": "units",
  "title": "Units",
  "default": "metric",
  "options": [
    { "value": "metric", "title": "Metric" },
    { "value": "imperial", "title": "Imperial" }
  ]
}
```

`env.configuration.units` is `"metric"` or `"imperial"`, whichever the user picked.

Expo Prebuild and Voltra Apply stop with an error that names the parameter if `default` is not one of the values, a value is empty or listed twice, or an option has no `title`.

## Choices the app sets at runtime

When the values come from the user's own data, like the teams they follow or the accounts they have, set `dynamicOptions: true` instead of `options`. The app then supplies the choices whenever they change:

```json
{
  "name": "team",
  "title": "Team",
  "dynamicOptions": true
}
```

```ts
import { setWidgetParameterOptions } from '@use-voltra/ios-client'

await setWidgetParameterOptions('scores_widget', 'team', [
  { value: 'red', title: 'Red Lions' },
  { value: 'blue', title: 'Blue Hawks' },
])
```

The choices are stored in the App Group, so this needs `groupIdentifier`. Setting them reloads the widget.

- A placement the user hasn't configured gets the first choice. The first choice is the default, so a `default` or `options` cannot be declared alongside `dynamicOptions`.
- A placement whose choice is no longer listed falls back to the first choice.
- With no choices, `env.configuration.team` is `""`. Use that to ask the user to set something up in the app.

Choice titles come from the app, so they are not translated by Voltra. The parameter `title` still is.

For a server-driven widget, put `{team}` in the `serverUpdate` URL to fetch each placement's own data. See [Per-instance requests](/ios/development/server-driven-widgets#per-instance-requests).

## Translate the Edit Widget sheet

iOS draws the Edit Widget sheet itself, so its text comes from `app.json` rather than from your widget code. `title` and `options[].title` accept locale maps, the same way `displayName` does. The sheet header shows the widget's `displayName`, so translate it the same way:

```json
{
  "id": "weather_widget",
  "entry": "./widgets/ios/weather-widget.tsx",
  "displayName": { "en": "Weather", "pl": "Pogoda" },
  "description": { "en": "Current conditions", "pl": "Aktualne warunki" },
  "appIntent": {
    "parameters": [
      {
        "name": "units",
        "title": { "en": "Units", "pl": "Jednostki" },
        "default": "metric",
        "options": [
          { "value": "metric", "title": { "en": "Metric", "pl": "Metryczne" } },
          { "value": "imperial", "title": { "en": "Imperial", "pl": "Imperialne" } }
        ]
      }
    ]
  }
}
```

iOS shows the sheet in the system language, and `setDynamicWidgetLocale` does not affect it. A language with no translation for a string shows your app's development language instead. Rebuild the native app after changing these. See [Localization](/ios/development/localization) for how the app's languages are declared.

## Notes

- `appIntent` only wires up for Dynamic Widgets.
- Defaults come from code, not from the native sheet.
- There is no `export` field in app.json for Dynamic Widgets.
- Use a real device to verify the Edit Widget flow.
