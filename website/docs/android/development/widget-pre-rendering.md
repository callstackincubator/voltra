# Widget Pre-rendering (Android)

Widget pre-rendering allows you to provide a meaningful initial state for your Android widgets before they are updated by the app for the first time.

## Configuration

Add `initialStatePath` to your widget configuration in the `@use-voltra/android-client` plugin in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/android-client",
        {
          "widgets": [
            {
              "id": "weather",
              "displayName": "Weather Widget",
              "description": "Shows current weather",
              "targetCellWidth": 2,
              "targetCellHeight": 2,
              "initialStatePath": "./widgets/weather-android-initial.tsx"
            }
          ]
        }
      ]
    ]
  }
}
```

For multiple locales, set `initialStatePath` to a map of locale tag → file path (same pattern as iOS); the first-run payload matches the device locale when possible.

## Implementation

Create a file at the specified `initialStatePath` that exports a default Voltra component (or a React element). For Android, this should use `VoltraAndroid` primitives.

```tsx
import { VoltraAndroid } from '@use-voltra/android'

const InitialWeatherWidget = (
  <VoltraAndroid.Box style={{ padding: 16, backgroundColor: '#3DDC84' }}>
    <VoltraAndroid.Text style={{ color: 'white' }}>
      Loading weather...
    </VoltraAndroid.Text>
  </VoltraAndroid.Box>
)

export default InitialWeatherWidget
```

:::info
`initialStatePath` files are **not** part of your React Native app bundle. They run in Node.js during prebuild. Import `VoltraAndroid` from `@use-voltra/android`, not `@use-voltra/android-client` — the client package pulls in native modules that are unavailable in the prebuild sandbox.
:::

## Build Process

During the build process (`npx expo prebuild`), Voltra executes these initial state files in a Node.js environment to generate the static layouts that will be displayed when the widget is first added to the home screen.

## Limitations

- **Environment**: The code runs in Node.js during build time, not on the device.
- **Imports**: Use `@use-voltra/android` for JSX and types in `initialStatePath` files. Do not import from `@use-voltra/android-client` or other React Native client APIs.
- **Static Content**: The initial state should represent a "loading" or "offline" state, as it won't have access to dynamic runtime data until the app runs.
