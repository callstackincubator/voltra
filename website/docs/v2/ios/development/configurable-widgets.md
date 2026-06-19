# Configurable Widgets

:::warning Experimental Feature
Configurable widgets are experimental. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

Configurable widgets let users edit widget parameters in the native iOS Edit Widget sheet. Voltra maps those parameters into `env.configuration`, so your JSX can switch on user choices at render time.

This feature is for Dynamic Widgets. Use it when the widget should stay dynamic, but the user still needs a few knobs such as a label, unit, theme, or source.

It requires iOS 17+, because Voltra wires it through `AppIntentConfiguration`.

## How it works

1. Define a Dynamic Widget module with a default export.
2. Add `entry` and `appIntent.parameters` to the widget config in `app.json`.
3. Read `env.configuration` inside the widget.
4. Let the user edit the widget from the iOS widget sheet.

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

## Using it in app

1. Build and install the app on a real iPhone.
2. Add the widget to Home Screen.
3. Long-press it and tap **Edit Widget**.
4. Change parameters.
5. Read values from `env.configuration` in your JSX.

If you need more than one value, add more entries to `appIntent.parameters` and read each key from `env.configuration`.

## Notes

- `appIntent` only wires up for Dynamic Widgets.
- Defaults come from code, not from the native sheet.
- There is no `export` field in app.json for Dynamic Widgets.
- Use a real device to verify the Edit Widget flow.
