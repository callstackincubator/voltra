# Widget Pre-rendering (Android)

Widget pre-rendering allows you to provide a meaningful initial state for your Android widgets before they are updated by the app for the first time.

## Configuration

Add `initialStatePath` to your widget configuration in the `android` section of the Voltra plugin in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "android": {
            "widgets": [
              {
                "id": "weather",
                "name": "Weather Widget",
                "initialStatePath": "./widgets/weather-android-initial.tsx"
              }
            ]
          }
        }
      ]
    ]
  }
}
```

## Implementation

Create a file at the specified `initialStatePath` that exports a default Voltra component (or a React element). For Android, this should use `VoltraAndroid` primitives.

```tsx
import { VoltraAndroid } from 'voltra'

const InitialWeatherWidget = (
  <VoltraAndroid.Box style={{ padding: 16, backgroundColor: '#3DDC84' }}>
    <VoltraAndroid.Text style={{ color: 'white' }}>
      Loading weather...
    </VoltraAndroid.Text>
  </VoltraAndroid.Box>
)

export default InitialWeatherWidget
```

## Build Process

During the build process (`npx expo prebuild`), Voltra executes these initial state files in a Node.js environment to generate the static layouts that will be displayed when the widget is first added to the home screen.

## Limitations

- **Environment**: The code runs in Node.js during build time, not on the device.
- **Imports**: Ensure you only import from `voltra` and avoid any browser or React Native specific APIs that aren't supported in Node.js.
- **Static Content**: The initial state should represent a "loading" or "offline" state, as it won't have access to dynamic runtime data until the app runs.
