# Widget Pre-rendering

Widget pre-rendering allows you to provide meaningful initial state for widgets before they are synced when the app runs for the first time.

## Configuration

Add `initialStatePath` to your widget configuration in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "widgets": [
            {
              "id": "weather",
              "displayName": "Weather Widget",
              "description": "Shows current weather conditions",
              "supportedFamilies": ["systemSmall", "systemMedium", "systemLarge"],
              "initialStatePath": "./widgets/weather-initial.tsx"
            }
          ]
        }
      ]
    ]
  }
}
```

## Implementation

Create a file at the specified `initialStatePath` that exports a `WidgetVariants` object:

```tsx
import { Voltra, type WidgetVariants } from 'voltra'

const initialState: WidgetVariants = {
  systemSmall: <Voltra.Text>Content</Voltra.Text>,
  systemMedium: <Voltra.Text>Content</Voltra.Text>,
  systemLarge: <Voltra.Text>Content</Voltra.Text>,
}

export default initialState
```

## Build Process

During build time, Voltra transpiles your widget files with Babel and executes them in a Node.js environment to generate initial states that are bundled into the iOS app.

## Limitations

- **Node.js Environment**: Code runs in Node.js, not in React Native or iOS
- **Babel Support**: TypeScript is supported via Babel transpilation
- **No Bundling**: Import resolution works for local files but there is no bundler involved
- **Voltra Imports**: Do not use `voltra/client` or `voltra/server` imports; use `voltra` instead
