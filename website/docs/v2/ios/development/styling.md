# Styling

You can style Voltra components using React Native-style `style` props. Voltra supports a limited subset of React Native style properties — enough to get you productive quickly if you already know RN styling.

## React Native style prop

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

- `position` - Positioning mode: `'static'` (default), `'relative'`, or `'absolute'`
- `left` - Horizontal position coordinate (used with `position`)
- `top` - Vertical position coordinate (used with `position`)
- `zIndex` - Z-order of the element

**Style:**

- `backgroundColor` - Background color (hex strings, color names, or CSS gradient strings — see [Gradients](./gradients))
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
- `fontFamily` - Custom font family name (see [Custom Fonts](./custom-fonts))
- `color` - Text color (maps to `foregroundStyle` modifier)
- `letterSpacing` - Spacing between characters (maps to `kerning` modifier)
- `fontVariant` - Font variant array (e.g., `['small-caps', 'tabular-nums']`). Supported values:
  - `'small-caps'` - Applies small caps styling (iOS 14+)
  - `'tabular-nums'` - Applies monospaced digits (iOS 15+)

**Effects:**

- `overflow: 'hidden'` - Clips content to bounds (maps to `clipped` modifier)

### Flexbox Properties (Opt-in)

When using the `View` component or enabling flexbox mode on `VStack`/`HStack` with `layout="flex"`, additional flexbox properties become available via the `style` prop:

**Container Properties:**
- `flexDirection`: `'row'` | `'column'` - Main axis direction
- `alignItems`: `'flex-start'` | `'center'` | `'flex-end'` | `'stretch'` - Cross-axis alignment
- `justifyContent`: `'flex-start'` | `'center'` | `'flex-end'` | `'space-between'` | `'space-around'` | `'space-evenly'` - Main-axis distribution
- `gap`: number - Spacing between children along the main axis (one-axis only, no columnGap/rowGap)

**Child Properties:**
- `flex`: number - Shorthand for flexGrow/flexShrink
- `flexGrow`: number - Growth factor
- `flexShrink`: number - Shrink factor
- `flexBasis`: number | 'auto' - Base size
- `alignSelf`: Override parent's alignItems

:::note
Flexbox properties only work when flexbox layout is enabled. See [Flexbox Layout](./flexbox-layout) for comprehensive documentation.
:::

### Limitations

Properties not listed above are ignored during rendering. This includes common React Native properties like:

- Flexbox layout properties (`flexDirection`, `justifyContent`, `alignItems`, `gap`, etc.) are only available when using flexbox layout. Use the `View` component or set `layout="flex"` on VStack/HStack to enable these properties. See [Flexbox Layout](./flexbox-layout) for details. Properties `flex`, `flexGrow`, `flexShrink`, `flexBasis`, and `alignSelf` work on children inside flexbox containers.
- `columnGap`, `rowGap`, and `flexWrap` properties - Voltra only supports a single `gap` value along the main axis, and does not support wrapping
- Percentage-based widths and heights
- `right` and `bottom` positioning properties - Only `left` and `top` are supported
- Most text styling properties beyond `fontSize`, `fontWeight`, `fontFamily`, `color`, `letterSpacing`, and `fontVariant`
- **Live Update Overrides**: Certain styling properties (like `height` or `borderRadius` on progress bars) may be ignored when using live-updating features like `timerInterval` to ensure compatibility with smooth system animations.

:::tip Positioning in Voltra

Voltra supports CSS-style positioning with three modes:

- **`position: 'static'`** - Normal layout flow. `left` and `top` are ignored.
- **`position: 'relative'`** - Offsets the element from its natural position using `left` and `top`. The offset moves the element right (positive `left`) and down (positive `top`).
- **`position: 'absolute'`** (default when `left`/`top` provided) - Positions the element's **center** at the coordinates specified by `left` and `top`. This differs from CSS which positions from the top-left corner, but matches SwiftUI's native behavior.

**Note**: If you provide `left` or `top` without specifying `position`, it defaults to `'absolute'` for backward compatibility. To ignore `left`/`top`, explicitly set `position: 'static'`.

For most layouts, prefer using stack `alignment` props (`ZStack`, `VStack`, `HStack`) which provide better layout control. Use positioning for fine-tuning or overlays.

See the [Layout & Containers](../components/layout) documentation for details on alignment.

:::

### Example

```tsx
import { Voltra } from '@use-voltra/ios'

const element = (
  <Voltra.VStack
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
)
```

For gradients and custom fonts, see the dedicated [Gradients](./gradients) and [Custom Fonts](./custom-fonts) pages.
