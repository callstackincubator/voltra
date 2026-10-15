---
title: "Styling"
description: "The React Native style properties Voltra supports on Android and how they map to Jetpack Compose Glance modifiers."
---

You can style Voltra components on Android using React Native-style `style` props. These properties are automatically converted to Jetpack Compose Glance modifiers. 

For Android system-aware colors, use [`AndroidDynamicColors`](/android/development/dynamic-colors) from `@use-voltra/android` instead of snapshotting palette values in JavaScript.

:::caution[Glance Limitations]
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
- `borderWidth`, `borderColor` - Border drawn inside the component's bounds, following `borderRadius`. Only drawn when `width` and `height` are both fixed numbers. See [Borders](#borders).

### Text

- `fontSize` - Font size in sp.
- `fontWeight` - Supports `"normal"` and `"bold"`.
- `fontFamily` - Font family name. Built-in values: `"monospace"`, `"serif"`, `"sans-serif"`, `"cursive"`. For custom fonts, see [Custom Fonts](/android/development/custom-fonts).
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

Android widgets can use semantic Material color roles (`AndroidDynamicColors.*`) so they follow the system palette even when the app isn't running. See [Dynamic Colors](/android/development/dynamic-colors) for the full role list, examples, and server-rendering behavior.

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

## Borders

Set `borderWidth` and `borderColor` to outline a component. The border follows `borderRadius` and works with `backgroundColor` and `backgroundImage`.

```tsx
<VoltraAndroid.Box
  style={{
    width: 50,
    height: 50,
    backgroundColor: '#1e293b',
    borderColor: '#FFD700',
    borderWidth: 1,
    borderRadius: 4,
  }}
  contentAlignment="center"
>
  <VoltraAndroid.Text style={{ fontSize: 12, color: '#fff' }}>100</VoltraAndroid.Text>
</VoltraAndroid.Box>
```

Glance has no border modifier, so Android draws the background and the border together into a bitmap that is stretched over the component. That has a few consequences:

- **Fixed size required.** The border is drawn only when `width` and `height` are both numbers. With `"100%"`, `flex`, or content-sized components, Android cannot know the component's size, and a stretched bitmap would distort the border, so it is skipped.
- **No layout change.** The border is painted inside the component's bounds, behind its children. It does not change the component's size or move its children; add `padding` of at least `borderWidth` so children do not cover it.
- **Rounded corners.** The background and border are rounded on every Android version. Children are clipped to the rounded outline only on Android 12+ (API 31), as with `borderRadius` alone.
- **Colors are resolved once.** `AndroidDynamicColors` used for `borderColor` or `backgroundColor` on a bordered component are resolved into the bitmap when the widget renders, like gradient stops.

## Limitations

The following properties are **NOT supported** on Android due to Glance limitations:

- **Margins:** `margin`, `marginTop`, etc. are not part of Android style types. If you need margin-like outside spacing, use `VoltraAndroid.Spacer` between elements.
- **Borders:** `borderWidth` and `borderColor` are drawn only on components with a fixed numeric `width` and `height`; see [Borders](#borders).
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

Anything else imported from `react-native` — components, `Dimensions`, `Animated`, `PixelRatio` —
is rejected with a message naming the symbol. Build steps that evaluate your widget
(`voltra apply` and `expo prebuild`) fail outright; a symbol that only appears on a branch those
steps never reach throws the same message when the widget renders, rather than reading as
`undefined`. Deep imports such as `react-native/Libraries/...` always fail the build. Use the
`VoltraAndroid` components for everything visual.
