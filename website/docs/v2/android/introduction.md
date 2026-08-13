# Android Introduction

:::warning Experimental Support
Android support is **experimental**. The API may still change before it's stable.
:::

Voltra lets you build Android Home Screen widgets with JSX. Under the hood it uses Jetpack Compose Glance, and Voltra's primitives map directly to Glance components.

## Widgets on Android

Android widgets have different layout and styling rules compared to iOS Live Activities. While iOS uses SwiftUI-based primitives (VStack, HStack, etc.), Android uses Jetpack Compose Glance primitives (Column, Row, Box).

Voltra abstracts these differences where possible, but provides platform-specific namespaces to ensure your UI looks and behaves correctly on each platform.

Voltra also exposes Android-specific semantic dynamic colors through `AndroidDynamicColors`, which lets widgets follow the current Material palette without requiring a JavaScript re-render. See [Dynamic Colors](./development/dynamic-colors).

Voltra also supports Android ongoing notifications for app-driven, persistent status updates. See [Managing Android Ongoing Notifications](./development/managing-ongoing-notifications).

### Simple Android Widget

```tsx
import { VoltraAndroid } from '@use-voltra/android'

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

## Testing and Previews

You can preview your Android widgets directly in your app using the `VoltraWidgetPreview` component. This allows for fast iteration without needing to constantly check the home screen.

Learn more in the [Testing and Previews guide](./development/testing-and-previews).

## Next Steps

Check out the [Setup guide](./setup) to set up Voltra for Android.

For notification-based experiences, see [Managing Android Ongoing Notifications](./development/managing-ongoing-notifications).
