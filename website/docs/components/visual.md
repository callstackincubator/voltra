# Visual Elements & Typography

Static or decorative elements used to display content.

### Text

Displays text content.

**Parameters:**

- `numberOfLines` (number, optional): Maximum number of lines to display

**Apple Documentation:** [Text](https://developer.apple.com/documentation/swiftui/text)

---

### Label

A semantic label that can display both an icon and title text.

**Parameters:**

- `title` (string, optional): Text content for the label
- `systemImage` (string, optional): SF Symbol name for the label icon

**Apple Documentation:** [Label](https://developer.apple.com/documentation/swiftui/label)

---

### Image

Displays bitmap images from the asset catalog or base64 encoded data.

**Parameters:**

- `source` (object, optional): Image source object. Either:
  - `{ assetName: string }` - Asset catalog name bundled inside the widget extension
  - `{ base64: string }` - Base64 encoded image data
- `resizeMode` (string, optional): How the image should be resized to fit its container - `"cover"`, `"contain"`, `"stretch"`, `"repeat"`, or `"center"` (default: `"cover"`)

**Examples:**

```tsx
// Using asset catalog
<Voltra.Image source={{ assetName: 'my-image' }} />

// Using base64 encoded image
<Voltra.Image source={{ base64: 'iVBORw0KGgoAAAANS...' }} />
```

**Apple Documentation:** [Image](https://developer.apple.com/documentation/swiftui/image)

---

### Symbol

Displays SF Symbols (system icons) with configuration options.

**Parameters:**

- `name` (string, optional): SF Symbol name
- `type` (string, optional): Symbol rendering type - `"monochrome"`, `"hierarchical"`, `"palette"`, or `"multicolor"`
- `scale` (string, optional): Symbol scale - `"default"`, `"unspecified"`, `"small"`, `"medium"`, or `"large"`
- `weight` (string, optional): Symbol weight - `"unspecified"`, `"ultraLight"`, `"thin"`, `"light"`, `"regular"`, `"medium"`, `"semibold"`, `"bold"`, `"heavy"`, or `"black"`
- `size` (number, optional): Symbol size in points (default: `24`)
- `tintColor` (string, optional): Tint color for the symbol
- `colors` (string, optional): Pipe-separated colors for palette type
- `resizeMode` (string, optional): Image resize mode
- `animationSpec` (string, optional): JSON-encoded animation specification

**Apple Documentation:** [Image](https://developer.apple.com/documentation/swiftui/image) (SF Symbols)

---

### Divider

A visual divider component used to separate content sections.

**Parameters:** None

**Apple Documentation:** [Divider](https://developer.apple.com/documentation/swiftui/divider)

---

### LinearGradient

A linear gradient background that can contain children. Creates a gradient effect using specified colors and stops.

**Parameters:**

- `colors` (string, optional): Pipe-separated color list (e.g., `'#ff0000|#00ff00|#0000ff'`)
- `stops` (string, optional): Pipe-separated gradient stops (e.g., `'red@0|orange@0.5|yellow@1'`)
- `startPoint` (string, optional): Start point (e.g., `'topLeading'`, `'center'`, or `'x,y'`)
- `endPoint` (string, optional): End point (e.g., `'bottomTrailing'`, `'center'`, or `'x,y'`)
- `dither` (boolean, optional): Enable dithering (system-controlled)

**Apple Documentation:** [LinearGradient](https://developer.apple.com/documentation/swiftui/lineargradient)

---
