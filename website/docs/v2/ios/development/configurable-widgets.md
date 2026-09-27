# Configurable Widgets

:::warning Experimental Feature
Configurable widgets are experimental. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

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
- `options` (optional): fixed values to pick from, each `{ "value": "...", "title": ... }`. The sheet shows a picker with the titles instead of a free-text field, and `env.configuration` receives the `value`. `default` must be one of the values; without it the first option is the default.

The sheet's title defaults to `Configure <displayName>`. Set `configurationTitle` on the widget, as a plain string or a locale map, to change it.

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

## Offering fixed choices

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

## Localising the sheet

The Edit Widget sheet is drawn by iOS, in the system language, and never runs your JavaScript, so its copy is translated at build time. `title`, `options[].title` and `configurationTitle` accept locale maps, the same way `displayName` does:

```json
{
  "id": "weather_widget",
  "entry": "./widgets/ios/weather-widget.tsx",
  "displayName": { "en": "Weather", "pl": "Pogoda" },
  "description": { "en": "Current conditions", "pl": "Aktualne warunki" },
  "configurationTitle": { "en": "Weather settings", "pl": "Ustawienia pogody" },
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

Voltra writes the translations to `Localizable.strings` in the widget extension, one `<language>.lproj` per language, and every language falls back to English for a string it has no translation for. See [Localisation](./localisation) for how the extension's languages are chosen.

## Notes

- `appIntent` only wires up for Dynamic Widgets.
- Defaults come from code, not from the native sheet.
- There is no `export` field in app.json for Dynamic Widgets.
- Use a real device to verify the Edit Widget flow.
