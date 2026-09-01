# Custom Fonts

Android Glance only supports a handful of built-in font families (`monospace`, `serif`, `sans-serif`, `cursive`). Voltra works around this by rendering text as a bitmap with a custom `Typeface` loaded from `assets/fonts/`.

## Setup

### 1. Add font files to the plugin config

List your font paths in the top-level `fonts` array. These can be local files or packages from `@expo-google-fonts`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/android-client",
        {
          "fonts": [
            "node_modules/@expo-google-fonts/pacifico/400Regular/Pacifico_400Regular.ttf",
            "./assets/fonts/MyCustomFont.ttf"
          ],
          "widgets": []
        }
      ]
    ]
  }
}
```

### 2. Run prebuild

```bash
npx expo prebuild
```

The plugin copies each font file to `android/app/src/main/assets/fonts/` automatically.

### 3. Use `renderAsBitmap` on Text

```tsx
import { VoltraAndroid } from '@use-voltra/android'

<VoltraAndroid.Text
  renderAsBitmap
  style={{
    fontSize: 24,
    fontFamily: 'Pacifico_400Regular',
    color: '#F472B6',
  }}
>
  Hello Voltra!
</VoltraAndroid.Text>
```

The `fontFamily` value should match the font filename **without the extension**.

Note that `renderAsBitmap` text is rasterized — it won't respond to system font size or accessibility settings. Use it only when a custom typeface is needed.

## Supported style properties

When rendering as bitmap, the following text style properties are supported:

| Property | Description |
|----------|-------------|
| `fontSize` | Font size in sp (scaled to device density) |
| `fontFamily` | Font filename without extension |
| `fontWeight` | `"normal"` or `"bold"` |
| `color` | Text color |
| `textAlign` | `"left"`, `"center"`, `"right"` |
| `textDecorationLine` | `"underline"`, `"line-through"` |
| `letterSpacing` | Letter spacing value |
| `lineHeight` | Line spacing |

## Built-in font families

For built-in families you don't need `renderAsBitmap` — use `fontFamily` in style directly:

- `monospace`
- `serif`
- `sans-serif`
- `cursive`

These are passed through to Glance's native `FontFamily` API.
