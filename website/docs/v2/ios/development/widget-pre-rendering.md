# Widget Pre-rendering

Widget pre-rendering allows you to provide meaningful initial state for widgets before they are synced when the app runs for the first time.

## Configuration

Add `initialStatePath` to your widget configuration in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/ios-client",
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

### Localized initial states

Use a locale map so the config plugin pre-renders one bundle per language; iOS and Android pick the best match at runtime from the device locale (fallback order: preferred languages → language-only → `en` → first locale):

```json
"initialStatePath": {
  "en": "./widgets/weather-initial.tsx",
  "pl": "./widgets/weather-initial-pl.tsx"
}
```

## Implementation

Create a file at each configured path that exports a `WidgetVariants` object (or use the same file path for multiple locales if copy is identical):

```tsx
import { Voltra, type WidgetVariants } from '@use-voltra/ios'

const initialState: WidgetVariants = {
  systemSmall: <Voltra.Text>Content</Voltra.Text>,
  systemMedium: <Voltra.Text>Content</Voltra.Text>,
  systemLarge: <Voltra.Text>Content</Voltra.Text>,
}

export default initialState
```

:::info
`initialStatePath` files are **not** part of your React Native app bundle. They run in Node.js during prebuild. Import `Voltra` and types from `@use-voltra/ios`, not `@use-voltra/ios-client` — the client package pulls in native modules that are unavailable in the prebuild sandbox.
:::

## Build Process

During build time, Voltra transpiles your widget files with Babel and executes them in a Node.js environment to generate initial states that are bundled into the iOS app.

## Limitations

- **Node.js Environment**: Code runs in Node.js, not in React Native or iOS
- **Babel Support**: TypeScript is supported via Babel transpilation
- **No Bundling**: Import resolution works for local files but there is no bundler involved
- **Voltra Imports**: Use `@use-voltra/ios` for JSX and types in `initialStatePath` files. Do not import from `@use-voltra/ios-client` or other React Native client APIs.
