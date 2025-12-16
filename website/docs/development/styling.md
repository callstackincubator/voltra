# Styling

You can style Voltra components using React Native-style `style` props. The `style` prop works with a limited set of React Native properties that are automatically converted to SwiftUI modifiers under the hood.

## React Native style prop

Voltra supports a limited subset of React Native style properties. When you pass a `style` prop to a Voltra component, these properties are automatically converted to SwiftUI modifiers under the hood. This makes it easy to get started if you're familiar with React Native styling.

### Supported properties

The following React Native style properties are supported:

**Layout:**

- `width` - Fixed width (number values only, percentages are ignored)
- `height` - Fixed height (number values only, percentages are ignored)
- `flex` - Flex shorthand (follows Yoga's behavior). Positive values act as `flexGrow`, negative values act as `flexShrink`. Explicit `flexGrow`/`flexShrink` take precedence if both are specified.
- `flexGrow` - Flex grow factor. When > 0, allows the view to grow to fill available space (converts to flexible frame with `maxWidth`/`maxHeight` set to infinity)
- `flexShrink` - Flex shrink factor. When > 0, allows the view to shrink below its ideal size (sets `minWidth`/`minHeight` to 0)
- `padding` - Uniform padding on all edges
- `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight` - Individual edge padding
- `paddingHorizontal`, `paddingVertical` - Horizontal and vertical padding
- `margin`, `marginTop`, `marginBottom`, `marginLeft`, `marginRight`, `marginHorizontal`, `marginVertical` - All margin properties are mapped to padding in SwiftUI

**Positioning:**

- `offsetX` - Horizontal offset from the element's natural position (positive = right, negative = left)
- `offsetY` - Vertical offset from the element's natural position (positive = down, negative = up)

**Style:**

- `backgroundColor` - Background color (hex strings or color names)
- `opacity` - Opacity value between 0 and 1
- `borderRadius` - Corner radius value
- `borderWidth` - Border width
- `borderColor` - Border color

**Shadow:**

- `shadowColor` - Shadow color
- `shadowOffset` - Shadow offset (`{ width: number, height: number }`)
- `shadowOpacity` - Shadow opacity
- `shadowRadius` - Shadow blur radius

**Text:**

- `fontSize` - Font size (maps to `font` modifier)
- `fontWeight` - Font weight (e.g., `'600'`, `'bold'`, `'regular'`)
- `color` - Text color (maps to `foregroundStyle` modifier)
- `letterSpacing` - Spacing between characters (maps to `kerning` modifier)
- `fontVariant` - Font variant array (e.g., `['small-caps', 'tabular-nums']`). Supported values:
  - `'small-caps'` - Applies small caps styling (iOS 14+)
  - `'tabular-nums'` - Applies monospaced digits (iOS 15+)

**Effects:**

- `overflow: 'hidden'` - Clips content to bounds (maps to `clipped` modifier)

### Limitations

Properties not listed above are ignored during rendering. This includes common React Native properties like:

- Most flexbox layout properties (`flexDirection`, `justifyContent`, `alignItems`, etc.) - Note: `flex`, `flexGrow`, and `flexShrink` are supported
- `gap` and spacing properties
- Percentage-based widths and heights
- CSS-style positioning (`position`, `top`, `left`, `right`, `bottom`) - Use SwiftUI-native positioning instead (see below)
- Most text styling properties beyond `fontSize`, `fontWeight`, `color`, `letterSpacing`, and `fontVariant`

:::tip Positioning in Voltra

Voltra uses SwiftUI's native positioning model instead of CSS-style absolute/relative positioning:

1. **Use stack `alignment` props** - `ZStack`, `VStack`, and `HStack` all support an `alignment` prop that positions all children
2. **Use `offsetX`/`offsetY` styles** - Fine-tune individual element positions with offset

See the [Layout & Containers](/api/components/layout) documentation for details on alignment.

:::

### Example

```tsx
import { Voltra } from 'voltra'
;<Voltra.VStack
  style={{
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#101828',
  }}
>
  <Voltra.Text
    style={{
      color: '#F8FAFC',
      fontSize: 18,
      fontWeight: '600',
    }}
  >
    Styled Text
  </Voltra.Text>
</Voltra.VStack>
```
