# Android Introduction

:::warning Experimental Support
Android support is **experimental**. Although it should work just fine, the API may change. Stay vigilant.
:::

Voltra brings the power of JSX-based UI to Android Home Screen widgets. Using Jetpack Compose Glance under the hood, Voltra allows you to define Android widgets using a set of primitives that map directly to Glance components.

## Widgets on Android

Android widgets have different layout and styling rules compared to iOS Live Activities. While iOS uses SwiftUI-based primitives (VStack, HStack, etc.), Android uses Jetpack Compose Glance primitives (Column, Row, Box).

Voltra abstracts these differences where possible, but provides platform-specific namespaces to ensure your UI looks and behaves correctly on each platform.

### Simple Android Widget

```tsx
import { VoltraAndroid } from 'voltra'

const MyWidget = () => (
  <VoltraAndroid.Column
    style={{
      padding: 16,
      backgroundColor: '#3DDC84',
      width: '100%',
      height: '100%'
    }}
    verticalAlignment="center-vertically"
    horizontalAlignment="center-horizontally"
  >
    <VoltraAndroid.Text
      style={{
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold'
      }}
    >
      Android Widget
    </VoltraAndroid.Text>
    <VoltraAndroid.Text
      style={{
        color: 'white'
      }}
    >
      Powered by Voltra & Glance
    </VoltraAndroid.Text>
  </VoltraAndroid.Column>
)
```

## Key Differences

- **Primitives:** Use `VoltraAndroid.Column`, `VoltraAndroid.Row`, and `VoltraAndroid.Box` instead of stacks.
- **Alignment:** Android uses specific alignment props like `verticalAlignment` and `horizontalAlignment`.
- **Sizing:** Use `"100%"` for full size or `"auto"` for wrapping content.

## Testing and Previews

You can preview your Android widgets directly in your app using the `VoltraWidgetPreview` component. This allows for fast iteration without needing to constantly check the home screen.

Learn more in the [Testing and Previews guide](./development/testing-and-previews).

## Next Steps

Check out the [Setup guide](./setup) to set up Voltra for Android.
