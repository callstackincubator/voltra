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
- `title`: label shown in the Edit Widget sheet
- `default`: code-defined starting value before the user changes anything

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

## Notes

- `appIntent` only wires up for Dynamic Widgets.
- Defaults come from code, not from the native sheet.
- There is no `export` field in app.json for Dynamic Widgets.
- Use a real device to verify the Edit Widget flow.
