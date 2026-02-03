# Visual Elements & Typography (iOS)

Static or decorative elements used to display content.

### Text

Displays text content.

**Parameters:**

- `numberOfLines` (number, optional): Maximum number of lines to display

---

### Label

A semantic label that can display both an icon and title text.

**Parameters:**

- `title` (string, optional): Text content for the label
- `systemImage` (string, optional): SF Symbol name for the label icon

---

### Image

Displays bitmap images from the asset catalog or base64 encoded data.

**Parameters:**

- `source` (object, optional): Image source object (`assetName` or `base64`)
- `resizeMode` (string, optional): `"cover"`, `"contain"`, `"stretch"`, `"repeat"`, or `"center"`

---

### Symbol

Displays SF Symbols (system icons) with configuration options.

---

### Divider

A visual divider component.

---

### LinearGradient

A linear gradient background that can contain children.

---

### Mask

Masks content using any Voltra element as the mask shape.
