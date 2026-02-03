# Visual Elements & Typography (Android)

Static or decorative elements used to display content on Android widgets. See [Styling](../development/styling) for details on supported style properties.

### Text

Displays text content.

**Parameters:**

- `maxLines` (number, optional): Maximum number of lines to display.

---

### Image

Displays bitmap images from the asset catalog or base64 encoded data.

**Parameters:**

- `source` (object, optional): Image source object.
  - `assetName` (string): Reference to a pre-bundled image (drawable resource) or a [preloaded image](../development/image-preloading).
  - `base64` (string): Base64 encoded image data.
- `resizeMode` (string, optional): `"cover"`, `"contain"`, `"stretch"`, `"repeat"`, or `"center"`.
- `contentScale` (string, optional): Glance-specific terminology for resize mode: `"crop"`, `"fit"`, `"fill-bounds"`.
- `contentDescription` (string, optional): Accessibility description for the image.
- `alpha` (number, optional): Opacity value from 0.0 to 1.0.
- `tintColor` (string, optional): Color to tint the image with.

:::tip Image Preloading
For dynamic images from remote URLs, use the [Image Preloading](../development/image-preloading) API to cache them locally for use in widgets.
:::
