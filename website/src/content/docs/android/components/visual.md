---
title: "Visual Elements & Typography (Android)"
description: "Reference for Voltra Android visual components such as Text and Image that display static content in widgets."
---

Static or decorative elements used to display content on Android widgets. See [Styling](/android/development/styling) for details on supported style properties.

### Text

Displays text content.

**Parameters:**

- `maxLines` (number, optional): Maximum number of lines to display.
- `renderAsBitmap` (boolean, optional): Renders text as a bitmap image to enable [custom fonts](/android/development/custom-fonts). Requires `fontFamily` in the style prop.

---

### Image

Displays bitmap images from the asset catalog, preloaded runtime cache, or base64 encoded data. SVGs should be rasterized through the image preloading API and referenced by `assetName`.

**Parameters:**

- `source` (object, optional): Image source object.
  - `assetName` (string): Reference to a pre-bundled image (drawable resource) or a [preloaded image](/android/development/image-preloading).
  - `base64` (string): Base64 encoded image data.
- `resizeMode` (string, optional): `"cover"`, `"contain"`, `"stretch"`, `"repeat"`, or `"center"`.
- `contentDescription` (string, optional): Accessibility description for the image.
- `contentScale` (string, optional): Glance-specific scaling mode: `"crop"`, `"cover"`, `"fit"`, `"contain"`, `"fill-bounds"`, or `"stretch"`.
- `alpha` (number, optional): Opacity value from 0.0 to 1.0.
- `colorFilter` (string, optional): Color tint filter for the image.
- `tintColor` (string, optional): Legacy alias for `colorFilter`.
- `fallback` (ReactNode, optional): Custom content rendered when the image is missing.

**Styling the fallback:**

To add a background color when an image is missing, use `backgroundColor` in the `style` prop:

```jsx
<Image
  source={{ assetName: 'photo' }}
  style={{ backgroundColor: '#E0E0E0', borderRadius: 12 }}
/>
```

**Rounded images:**

`borderRadius` rounds the image's box, not the picture inside it. With the default `contentScale` (`"fit"`), a picture whose aspect ratio differs from the box is letterboxed, so it doesn't reach the rounded corners and looks square. Use `"crop"` (or `"cover"`) to fill the box, or give the box the picture's aspect ratio:

```jsx
<Image
  source={{ assetName: 'avatar' }}
  contentScale="crop"
  style={{ width: 48, height: 48, borderRadius: 24 }}
/>
```

On Android 12 (API 31) and newer, the radius clips the image view. On older versions, Voltra rounds the bitmap itself so the picture looks the same, but only when the `Image` has a fixed numeric `width` and `height` and no padding; otherwise the radius is ignored. A `backgroundColor` on the `Image` keeps square corners on those older versions.

:::tip[Image Preloading]
For dynamic images from remote URLs, use the [Image Preloading](/android/development/image-preloading) API to cache them locally for use in widgets.
:::
