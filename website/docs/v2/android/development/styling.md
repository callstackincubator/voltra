# Styling

You can style Voltra components on Android using React Native-style `style` props. These properties are automatically converted to Jetpack Compose Glance modifiers. 

For Android system-aware colors, use [`AndroidDynamicColors`](./dynamic-colors) from `@use-voltra/android` instead of snapshotting palette values in JavaScript.

:::warning Glance Limitations
Android widgets are built using **Jetpack Compose Glance**, which has a significantly more limited styling API compared to standard Compose or SwiftUI. Many common React Native style properties are either not supported or have limited support.
:::

## Supported Properties

The following React Native style properties are supported on Android:

### Layout

- `width`, `height` - Fixed dimensions (number values in dp) or `"100%"` to fill available space.
- `flex`, `flexGrow` - Flex weight. When > 0, the component will take up a proportional amount of space in its parent container (maps to `.defaultWeight()` in Glance).
- `padding` - Uniform padding on all edges.
- `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight` - Individual edge padding.
- `paddingHorizontal`, `paddingVertical` - Horizontal and vertical padding.
- `visibility` - Controls component visibility (`"visible"`, `"hidden"`, or `"invisible"`).

### Visual Style

- `backgroundColor` - Background color (hex strings, color names, or `AndroidDynamicColors.*` tokens).
- `backgroundImage` - CSS gradient background. Supports `linear-gradient(...)`, `radial-gradient(...)`, and `conic-gradient(...)`.
- `borderRadius` - Corner radius value. **Note:** Requires Android 12+ (API 31). On older versions, this property is ignored.

### Text

- `fontSize` - Font size in sp.
- `fontWeight` - Supports `"normal"` and `"bold"`.
- `fontFamily` - Font family name. Built-in values: `"monospace"`, `"serif"`, `"sans-serif"`, `"cursive"`. For custom fonts, see [Custom Fonts](./custom-fonts).
- `color` - Text color (literal colors or `AndroidDynamicColors.*`).
- `textDecorationLine` - Supports `"underline"` and `"line-through"`.
- `textAlign` - Alignment of text within the component (`"left"`, `"center"`, `"right"`).
- `numberOfLines` - Limits the number of lines displayed.

### Image Specific

In addition to general styles, `Image` components support:

- `resizeMode` - `"cover"`, `"contain"`, `"stretch"`, `"repeat"`, or `"center"`.
- `contentScale` - `"crop"`, `"cover"`, `"fit"`, `"contain"`, `"fill-bounds"`, or `"stretch"`.
- `alpha` - Opacity of the image (0.0 to 1.0).
- `colorFilter` - Applies a color filter to the image.

## Dynamic colors

Android widgets can use semantic Material color roles (`AndroidDynamicColors.*`) so they follow the system palette even when the app isn't running. See [Dynamic Colors](./dynamic-colors) for the full role list, examples, and server-rendering behavior.

## Gradient Backgrounds

Android widgets support gradient backgrounds through the camel-case `style.backgroundImage` property.

```tsx
import { VoltraAndroid } from '@use-voltra/android'

const element = (
  <VoltraAndroid.Box
    style={{
      width: '100%',
      height: '100%',
      padding: 16,
      borderRadius: 16,
      backgroundColor: '#0F172A',
      backgroundImage: 'linear-gradient(to right, #22D3EE 0%, #6366F1 100%)',
    }}
  >
    <VoltraAndroid.Text
      style={{
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: 'bold',
      }}
    >
      Gradient Widget
    </VoltraAndroid.Text>
  </VoltraAndroid.Box>
)
```

Supported gradient functions are `linear-gradient(...)`, `radial-gradient(...)`, and `conic-gradient(...)`. Repeating gradients, malformed gradients, unsupported color tokens, and invalid stop positions are ignored. If `backgroundColor` is also provided, Android paints it behind transparent gradient pixels and uses it as a fallback when a gradient cannot be rendered.

Gradient stops can use Android dynamic color tokens from `AndroidDynamicColors`, but those colors are resolved into the generated bitmap when the widget renders or updates. Existing gradient bitmaps do not recolor until the widget is rendered again.

Use `backgroundImage`, not `background-image`. Gradient bitmaps are generated natively during widget rendering and capped before being passed to Glance, so the bitmap does not control layout size.

## Limitations

The following properties are **NOT supported** on Android due to Glance limitations:

- **Margins:** `margin`, `marginTop`, etc. are not part of Android style types. If you need margin-like outside spacing, use `VoltraAndroid.Spacer` between elements.
- **Borders:** `borderWidth` and `borderColor` are not yet implemented.
- **Shadows:** `shadowColor`, `shadowOffset`, `shadowOpacity`, and `shadowRadius` are not supported.
- **Positioning:** Absolute positioning (`top`, `left`, `zIndex`) is not supported. Use stack alignments and spacers.
- **Transforms:** `transform` (rotate, scale, etc.) is not supported.
- **Opacity:** The general `style.opacity` property is not supported (except for the `alpha` prop on `Image`).
- **Dimensions:** `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, and `aspectRatio` are not supported.
- **Text Effects:** `letterSpacing`, `fontVariant`, and custom `lineHeight` are not supported.

## Example

```tsx
import { VoltraAndroid } from '@use-voltra/android'

const element = (
  <VoltraAndroid.Column
    style={{
      padding: 16,
      backgroundColor: '#101828',
    }}
  >
    <VoltraAndroid.Text
      style={{
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: 'bold',
      }}
    >
      Android Widget Text
    </VoltraAndroid.Text>
  </VoltraAndroid.Column>
)
```

## Sharing styles with `StyleSheet`

Widget files can import `StyleSheet` and `Platform` from `react-native`, so styles can live
outside the element tree exactly as they do in the rest of your app:

```tsx
import { Platform, StyleSheet } from 'react-native'
import { VoltraAndroid } from '@use-voltra/android'

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#101828',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
})

const element = (
  <VoltraAndroid.Column style={styles.container}>
    <VoltraAndroid.Text style={styles.title}>{Platform.OS}</VoltraAndroid.Text>
  </VoltraAndroid.Column>
)
```

Widget code does not run against the React Native runtime — at build time it is evaluated in a
Node sandbox, and Dynamic Widgets run on device in a separate JS engine with no bridge. Only the
parts of `react-native` that are pure data manipulation are therefore available:

- `StyleSheet.create`, `StyleSheet.flatten`, `StyleSheet.compose`, `StyleSheet.absoluteFill`,
  `StyleSheet.absoluteFillObject`, and `StyleSheet.hairlineWidth`.
- `Platform.OS` and `Platform.select`. Inside a widget, `Platform.OS` is the platform the widget is
  being built for, so `Platform.select` picks the same branch at build time and on device.

Anything else imported from `react-native` — components, `Dimensions`, `Animated`, `PixelRatio`,
deep imports such as `react-native/Libraries/...` — fails the build with an explicit error rather
than misbehaving at render time. Use the `VoltraAndroid` components for everything visual.
