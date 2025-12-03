# Styling

You can style Voltra components using either React Native-style `style` props or SwiftUI modifiers. The `style` prop works with a limited set of React Native properties, while modifiers give you direct access to SwiftUI's styling system.

## React Native style prop

Voltra supports a limited subset of React Native style properties. When you pass a `style` prop to a Voltra component, these properties are automatically converted to SwiftUI modifiers under the hood. This makes it easy to get started if you're familiar with React Native styling.

### Supported properties

The following React Native style properties are supported:

**Layout:**

- `width` - Fixed width (number values only, percentages are ignored)
- `height` - Fixed height (number values only, percentages are ignored)
- `padding` - Uniform padding on all edges
- `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight` - Individual edge padding
- `paddingHorizontal`, `paddingVertical` - Horizontal and vertical padding
- `margin`, `marginTop`, `marginBottom`, `marginLeft`, `marginRight`, `marginHorizontal`, `marginVertical` - All margin properties are mapped to padding in SwiftUI

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

**Effects:**

- `overflow: 'hidden'` - Clips content to bounds (maps to `clipped` modifier)

### Limitations

Properties not listed above are ignored during rendering. This includes common React Native properties like:

- Flexbox layout properties (`flex`, `flexDirection`, `justifyContent`, `alignItems`, etc.)
- `gap` and spacing properties
- Percentage-based widths and heights
- `position` and absolute positioning
- Most text styling properties beyond `fontSize`, `fontWeight`, and `color`

If you need styling capabilities beyond what the `style` prop supports, use modifiers instead.

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

## Modifiers

Modifiers are the preferred way to style Voltra components. They provide direct equivalents of built-in SwiftUI styling modifiers, giving you full access to SwiftUI's powerful styling capabilities. Modifiers offer more control and flexibility than the React Native `style` prop, and they're the recommended approach for advanced styling needs.

### Using modifiers

Pass modifiers to any Voltra component using the `modifiers` prop:

```tsx
import { Voltra } from 'voltra'
;<Voltra.Text
  modifiers={[
    { name: 'font', args: { size: 18, weight: '600' } },
    { name: 'foregroundStyle', args: { color: '#F8FAFC' } },
    { name: 'opacity', args: { value: 0.9 } },
  ]}
>
  Styled Text
</Voltra.Text>
```

You can combine modifiers with the `style` prop - modifiers from both sources will be merged together:

```tsx
<Voltra.VStack
  style={{ padding: 16, backgroundColor: '#101828' }}
  modifiers={[
    { name: 'cornerRadius', args: { radius: 18 } },
    { name: 'shadow', args: { color: '#000', radius: 8, opacity: 0.3 } },
  ]}
>
  {/* content */}
</Voltra.VStack>
```

### Modifier categories

Modifiers are organized into categories based on their purpose:

#### Layout modifiers

- **`frame`** - Sets the frame dimensions (`{ width?: number, height?: number, maxWidth?: 'infinity' }`)
- **`padding`** - Adds padding around the view (`{ all?: number, top?: number, bottom?: number, leading?: number, trailing?: number }`)
- **`offset`** - Offsets the view by x and y values (`{ x?: number, y?: number }`)

#### Style modifiers

- **`foregroundStyle`** - Sets the foreground color (`{ color: string }`)
- **`background`** - Sets the background color (`{ color: string }`)
- **`backgroundStyle`** - Sets the background style, alias for `background` (`{ color: string }`)
- **`tint`** - Sets the tint color (`{ color: string }`)
- **`opacity`** - Sets the opacity (`{ value: number }` where value is 0-1)
- **`cornerRadius`** - Applies corner radius (`{ radius: number }`)

#### Text modifiers

- **`font`** - Sets the font (`{ size: number, weight?: string }`)
- **`fontWeight`** - Sets the font weight (`{ weight: string }`)
- **`italic`** - Applies italic styling (`{ enabled?: boolean }`)
- **`lineLimit`** - Limits the number of lines (`{ value: number }`)
- **`lineSpacing`** - Sets spacing between lines (`{ value: number }`)
- **`kerning`** - Sets spacing between characters (`{ value: number }`)
- **`multilineTextAlignment`** - Sets text alignment (`{ value: 'leading' | 'center' | 'right' }`)
- **`underline`** - Applies underline (`{ enabled?: boolean, color?: string }`)
- **`strikethrough`** - Applies strikethrough (`{ enabled?: boolean, color?: string }`)

#### Effect modifiers

- **`shadow`** - Applies a shadow (`{ color?: string, opacity?: number, radius?: number, x?: number, y?: number }`)
- **`scaleEffect`** - Scales the view (`{ value?: number }` or `{ x?: number, y?: number }`)
- **`rotationEffect`** - Rotates the view (`{ degrees: number }`)
- **`border`** - Adds a border (`{ width?: number, color?: string, cornerRadius?: number }`)
- **`clipped`** - Clips the view to its bounds (`{ enabled?: boolean }`)
- **`glassEffect`** - Applies iOS 26+ Liquid Glass effect (`{ enabled?: boolean, shape?: 'rect' | 'roundedRect' | 'capsule' | 'circle', cornerRadius?: number }`)

## Examples

### Text styling

```tsx
<Voltra.Text
  modifiers={[
    { name: 'font', args: { size: 24, weight: 'bold' } },
    { name: 'foregroundStyle', args: { color: '#38BDF8' } },
    { name: 'italic', args: { enabled: true } },
    { name: 'underline', args: { enabled: true, color: '#38BDF8' } },
    { name: 'lineSpacing', args: { value: 4 } },
  ]}
>
  Styled Heading
</Voltra.Text>
```

### Layout styling

```tsx
<Voltra.VStack
  modifiers={[
    { name: 'frame', args: { width: 300, height: 200 } },
    { name: 'padding', args: { all: 20 } },
    { name: 'offset', args: { x: 10, y: 10 } },
  ]}
>
  {/* content */}
</Voltra.VStack>
```

### Effects

```tsx
<Voltra.VStack
  modifiers={[
    { name: 'background', args: { color: '#FFFFFF' } },
    { name: 'cornerRadius', args: { radius: 12 } },
    { name: 'shadow', args: { color: '#000', radius: 10, opacity: 0.2, y: 5 } },
    { name: 'scaleEffect', args: { value: 1.05 } },
  ]}
>
  {/* content */}
</Voltra.VStack>
```
