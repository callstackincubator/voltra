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
- `gap` - Spacing (in dp) between children. Supported on `Column`, `Row`, `LazyColumn`, and `LazyVerticalGrid`. The gap goes only between children, never around the outside, except on a `LazyVerticalGrid` with adaptive columns, where the grid's outer edge also gets half the gap.
- `visibility` - Controls component visibility (`"visible"`, `"hidden"`, or `"invisible"`).

### Visual Style

- `backgroundColor` - Background color (hex strings, color names, `AndroidDynamicColors.*` tokens, or a [`{ day, night }` pair](#day-and-night-colors)).
- `backgroundImage` - CSS gradient background. Supports `linear-gradient(...)`, `radial-gradient(...)`, and `conic-gradient(...)`, or a [`{ day, night }` pair of gradients](#gradients-in-light-and-dark).
- `borderRadius` - Corner radius in dp. **Note:** Requires Android 12+ (API 31). On older versions it is ignored, except on an `Image` with a fixed numeric `width` and `height`. On an `Image`, the radius rounds the image's box, not the picture inside it; see [Image](/android/components/visual#image).
- `borderWidth`, `borderColor` - Border drawn inside the component's bounds, following `borderRadius`. Only drawn when `width` and `height` are both fixed numbers. See [Borders](#borders).

### Text

- `fontSize` - Font size in sp.
- `fontWeight` - Supports `"normal"` and `"bold"`.
- `fontFamily` - Font family name. Built-in values: `"monospace"`, `"serif"`, `"sans-serif"`, `"cursive"`. For custom fonts, see [Custom Fonts](/android/development/custom-fonts).
- `color` - Text color (literal colors, `AndroidDynamicColors.*`, or a [`{ day, night }` pair](#day-and-night-colors)).
- `textDecorationLine` - Supports `"underline"` and `"line-through"`.
- `textAlign` - Alignment of text within the component (`"left"`, `"center"`, `"right"`).
- `numberOfLines` - Limits the number of lines displayed.

### Day and night colors

`backgroundColor` and text `color` also take a `{ day, night }` pair: one color for the light system theme and one for the dark. The pair follows the system light/dark setting, not the time of day. The type is `AndroidColorPair`, exported from `@use-voltra/android`:

```tsx
import type { AndroidColorPair } from '@use-voltra/android'

const cardBackground: AndroidColorPair = { day: '#ffffff', night: 'rgba(32, 33, 36, 0.9)' }

<Column style={{ backgroundColor: cardBackground }}>
  <Text style={{ color: { day: '#202124', night: 'white' } }}>Hello</Text>
</Column>
```

On Android 12+ the launcher switches between the two colors itself when the theme changes. On older versions the color is picked when the widget is drawn.

- Each side takes any literal color the string form accepts, including alpha (`#ffffff80`, `rgba()`, `hsla()`), color names and `transparent`. Alpha is kept per side.
- `AndroidDynamicColors.*` tokens are not allowed inside a pair and fail to compile. A side typed as plain `string` fails too, so pass a literal color.
- A pair with a missing, empty or invalid side is dropped as a whole, and the property falls back to its default. Other keys are ignored.
- Component color props, `borderColor` and `shadowColor` take pairs too. Borders and shadows are not drawn yet.
- Gradients and charts can follow the theme too. See [Gradients in light and dark](#gradients-in-light-and-dark) and [Charts](/android/charts#colors-in-light-and-dark).

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

Use `backgroundImage`, not `background-image`. Gradient bitmaps are generated natively during widget rendering and capped before being passed to Glance, so the bitmap does not control layout size.

### Gradients in light and dark

A gradient can follow the system theme in two ways:

- **Tokens in the stops.** Stops accept `AndroidDynamicColors.*` tokens. They don't take `{ day, night }` pairs.
- **A pair of whole gradients.** `backgroundImage` takes `{ day: '<css gradient>', night: '<css gradient>' }`, and Android draws the side for the current theme.

```tsx
import { AndroidDynamicColors, VoltraAndroid } from '@use-voltra/android'

// Theme colors in the stops
<VoltraAndroid.Box
  style={{
    backgroundImage: `linear-gradient(to right, ${AndroidDynamicColors.primary}, ${AndroidDynamicColors.tertiary})`,
  }}
/>

// A different gradient per theme
<VoltraAndroid.Box
  style={{
    backgroundImage: {
      day: 'linear-gradient(to right, #e3f2fd, #90caf9)',
      night: 'radial-gradient(circle at center, #1a237e, #000000)',
    },
  }}
/>
```

If either side is missing, empty or not a valid gradient, the pair is dropped and `backgroundColor` shows instead. A gradient is drawn into a bitmap in the current theme's colors on every Android version, so it changes on the widget's next redraw.

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

- **Fixed size required.** The border is drawn only when `width` and `height` are both numbers, set in `style` or by size modifiers. With `"100%"`, `flex`, or content-sized components, Android cannot know the component's size, and a stretched bitmap would distort the border, so it is skipped.
- **No layout change.** The border is painted inside the component's bounds, behind its children. It does not change the component's size or move its children; add `padding` of at least `borderWidth` so children do not cover it.
- **Rounded corners.** The background and border are rounded on every Android version. Children are clipped to the rounded outline only on Android 12+ (API 31), as with `borderRadius` alone.
- **Colors are resolved once.** `AndroidDynamicColors` used for `borderColor` or `backgroundColor` on a bordered component are resolved into the bitmap when the widget renders, like gradient stops.

### Borders on an Image

On an `Image`, the border is part of the background bitmap, which Android draws **under** the picture. A picture that fills the view (`crop`, `fill-bounds`, or any picture with the view's aspect ratio) covers the border. Padding does not fix this: the picture is inset but keeps square corners, and only the outer edge of the view is rounded.

To get a ring around a round image, wrap the `Image` in a bordered `Box` with padding of at least `borderWidth`:

```tsx
<VoltraAndroid.Box
  style={{ width: 48, height: 48, padding: 2, borderWidth: 2, borderColor: '#FFD700', borderRadius: 24 }}
  contentAlignment="center"
>
  <VoltraAndroid.Image
    source={{ base64: avatar }}
    contentScale="crop"
    style={{ width: 44, height: 44, borderRadius: 22 }}
  />
</VoltraAndroid.Box>
```

## Limitations

The following properties are **NOT supported** on Android due to Glance limitations:

- **Margins:** `margin`, `marginTop`, etc. are not part of Android style types. Use `gap` for spacing between the children of a `Column`, `Row`, `LazyColumn`, or `LazyVerticalGrid`, or `VoltraAndroid.Spacer` for other outside-spacing needs.
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
