# Styling

You can style Voltra components on Android using React Native-style `style` props. These properties are automatically converted to Jetpack Compose Glance modifiers. 

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

- `backgroundColor` - Background color (hex strings or color names).
- `borderRadius` - Corner radius value. **Note:** Requires Android 12+ (API 31). On older versions, this property is ignored.

### Text

- `fontSize` - Font size in sp.
- `fontWeight` - Supports `"normal"` and `"bold"`.
- `color` - Text color.
- `textDecorationLine` - Supports `"underline"` and `"line-through"`.
- `textAlign` - Alignment of text within the component (`"left"`, `"center"`, `"right"`).
- `numberOfLines` - Limits the number of lines displayed.

### Image Specific

In addition to general styles, `Image` components support:

- `resizeMode` (or `contentScale`) - `"cover"`, `"contain"`, `"stretch"`, or `"center"`.
- `alpha` - Opacity of the image (0.0 to 1.0).
- `tintColor` - Applies a color filter to the image.

## Limitations

The following properties are **NOT supported** on Android due to Glance limitations:

- **Margins:** `margin`, `marginTop`, etc. are currently ignored. Use `padding` on parent containers or `Spacer` components instead.
- **Borders:** `borderWidth` and `borderColor` are not yet implemented.
- **Shadows:** `shadowColor`, `shadowOffset`, `shadowOpacity`, and `shadowRadius` are not supported.
- **Positioning:** Absolute positioning (`top`, `left`, `zIndex`) is not supported. Use stack alignments and spacers.
- **Transforms:** `transform` (rotate, scale, etc.) is not supported.
- **Opacity:** The general `style.opacity` property is not supported (except for the `alpha` prop on `Image`).
- **Dimensions:** `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, and `aspectRatio` are not supported.
- **Text Effects:** `letterSpacing`, `fontVariant`, and custom `lineHeight` are not supported.

## Example

```tsx
import { Voltra } from 'voltra'

const element = (
  <Voltra.VStack
    style={{
      padding: 16,
      backgroundColor: '#101828',
    }}
  >
    <Voltra.Text
      style={{
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: 'bold',
      }}
    >
      Android Widget Text
    </Voltra.Text>
  </Voltra.VStack>
)
```
