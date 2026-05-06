# Image Preloading (Android)

Android widgets have limitations when it comes to displaying remote images directly. The image preloading API allows you to download images to the app's cache directory, making them available to your widgets via a local `FileProvider`.

## Overview

The image preloading system on Android works by:

1. Downloading images from URLs to the internal app cache.
2. Rasterizing SVG inputs to PNG when needed.
3. Making these images available to Voltra widgets via the `assetName` property.
4. Providing APIs to reload widgets when new images are ready.

## API Reference

### `preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult>`

Downloads images to the Android cache for use in Widgets.

```typescript
type PreloadImageOptions = {
  key: string // The assetName to use when referencing this image
  url?: string // The URL to download the image from
  svg?: string // Inline SVG markup to rasterize and cache as PNG
  method?: 'GET' | 'POST' | 'PUT' // HTTP method (default: 'GET')
  headers?: Record<string, string> // Optional HTTP headers
  width?: number // Required when rasterizing SVG
  height?: number // Required when rasterizing SVG
}

type PreloadImagesResult = {
  succeeded: string[] // Keys of successfully downloaded images
  failed: { key: string; error: string }[] // Failed downloads with error messages
}
```

**Example:**

```typescript
import { preloadImages } from '@use-voltra/android-client'

const result = await preloadImages([
  {
    url: 'https://example.com/album-art.jpg',
    key: 'current-album',
    headers: { Authorization: 'Bearer token' },
  },
  {
    key: 'status-icon-active',
    svg: '<svg viewBox="0 0 24 24"><path fill="#34C759" d="..." /></svg>',
    width: 24,
    height: 24,
  },
])

if (result.succeeded.includes('status-icon-active')) {
  // Images are ready to be used in widgets
}
```

### `reloadWidgets(widgetIds?: string[]): Promise<void>`

Reloads Android widgets to pick up newly preloaded images. If no `widgetIds` are provided, all active widgets will be reloaded.

```typescript
import { reloadWidgets } from '@use-voltra/android-client'

// Reload all widgets
await reloadWidgets()

// Reload specific widgets
await reloadWidgets(['weather_widget'])
```

### `clearPreloadedImages(keys?: string[]): Promise<void>`

Removes preloaded images from the Android cache. If no `keys` are provided, all preloaded images will be cleared.

```typescript
import { clearPreloadedImages } from '@use-voltra/android-client'

// Clear specific images
await clearPreloadedImages(['current-album'])

// Clear all preloaded images
await clearPreloadedImages()
```

## Usage in Android Widgets

Once images are preloaded, reference them using the `assetName` property in the `VoltraAndroid.Image` component:

```tsx
import { VoltraAndroid } from '@use-voltra/android'

function MusicWidget({ albumKey }) {
  return (
    <VoltraAndroid.Box style={{ padding: 16 }}>
      <VoltraAndroid.Image
        source={{ assetName: albumKey }}
        style={{ width: 100, height: 100, borderRadius: 8 }}
      />
    </VoltraAndroid.Box>
  )
}
```
