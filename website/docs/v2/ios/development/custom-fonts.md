# Custom Fonts

Voltra supports custom fonts through the `fontFamily` style property.

## Adding Custom Fonts to Your Project

Voltra supports custom fonts in your Live Activities and Widgets through two main methods:

### 1. Using Voltra's Font Configuration (Recommended)

The simplest way is to specify fonts directly in the Voltra plugin configuration. This follows the same pattern as `expo-font`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/ios-client",
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

### 2. Adding Fonts Manually in Xcode

For non-Expo projects or if you prefer manual configuration, you can add fonts directly to your Xcode project:

1. Add your font files (`.otf` or `.ttf`) to your Xcode project
2. Ensure they're included in the Live Activity target's "Copy Bundle Resources" build phase
3. Add the font file names to your `Info.plist` under the `UIAppFonts` key for Live Activity target

For detailed instructions, see Apple's documentation on [Applying custom fonts to text](https://developer.apple.com/documentation/swiftui/applying-custom-fonts-to-text).

## Using Custom Fonts

Once your fonts are added to the project, you can use them with the `fontFamily` style property:

```tsx
import { Voltra } from '@use-voltra/ios'

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

## Font Weight with Custom Fonts

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

## Example with Google Fonts

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
