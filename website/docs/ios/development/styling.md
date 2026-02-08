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

- `position` - Positioning mode: `'static'` (default), `'relative'`, or `'absolute'`
- `left` - Horizontal position coordinate (used with `position`)
- `top` - Vertical position coordinate (used with `position`)
- `zIndex` - Z-order of the element

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
- `fontFamily` - Custom font family name (see [Custom Fonts](#custom-fonts) section below)
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
import { Voltra } from 'voltra'

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

## Custom Fonts

Voltra supports custom fonts through the `fontFamily` style property.

### Adding Custom Fonts to Your Project

Voltra supports custom fonts in your Live Activities and Widgets through two main methods:

#### 1. Using Voltra's Font Configuration (Recommended)

The simplest way is to specify fonts directly in the Voltra plugin configuration. This follows the same pattern as `expo-font`:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "groupIdentifier": "group.com.example.app",
          "fonts": ["./assets/fonts", "./assets/custom-font.ttf"]
        }
      ]
    ]
  }
}
```

The `fonts` array can include:
- Individual font files: `"./assets/fonts/CustomFont.ttf"`
- Entire directories: `"./assets/fonts"` (all fonts in the directory will be included)
- Supported formats: `.ttf`, `.otf`, `.woff`, `.woff2`

#### 2. Adding Fonts Manually in Xcode

For non-Expo projects or if you prefer manual configuration, you can add fonts directly to your Xcode project:

1. Add your font files (`.otf` or `.ttf`) to your Xcode project
2. Ensure they're included in the Live Activity target's "Copy Bundle Resources" build phase
3. Add the font file names to your `Info.plist` under the `UIAppFonts` key for Live Activity target

For detailed instructions, see Apple's documentation on [Applying custom fonts to text](https://developer.apple.com/documentation/swiftui/applying-custom-fonts-to-text).

### Using Custom Fonts

Once your fonts are added to the project, you can use them with the `fontFamily` style property:

```tsx
import { Voltra } from 'voltra'

const element = (
  <Voltra.Text
    style={{
      fontFamily: 'CustomFontName',
      fontSize: 20,
      color: '#FFFFFF',
    }}
  >
    Text with Custom Font
  </Voltra.Text>
)
```

:::tip Font Family Names

The font family name you use in `fontFamily` should match the font's PostScript name, not the file name. You can find the PostScript name:
- In the Font Book app on macOS
- Using online tools like [fontdrop.info](https://fontdrop.info)
- In Xcode's font picker

For example, the font file `Inter-Bold.ttf` has the PostScript name `Inter-Bold`.

:::

### Font Weight with Custom Fonts

When using `fontFamily`, the `fontWeight` style property is ignored since you typically specify the exact font variant (e.g., `Inter-Bold`, `Inter-Regular`). If you need different weights, add multiple font files and specify the complete font name:

```tsx
// Regular weight
<Voltra.Text style={{ fontFamily: 'Inter-Regular' }}>
  Regular Text
</Voltra.Text>

// Bold weight
<Voltra.Text style={{ fontFamily: 'Inter-Bold' }}>
  Bold Text
</Voltra.Text>
```

### Example with Google Fonts

If you're using Google Fonts via `@expo-google-fonts`, they work seamlessly with Voltra:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-font",
        {
          "fonts": ["node_modules/@expo-google-fonts/inter/Inter_400Regular.ttf"]
        }
      ]
    ]
  }
}
```

```tsx
<Voltra.Text style={{ fontFamily: 'Inter_400Regular' }}>
  Text using Google Font
</Voltra.Text>
```

:::note System Font Fallback
If `fontFamily` is not specified or the font cannot be found, Voltra will fall back to the system font with the specified `fontWeight`.
:::

