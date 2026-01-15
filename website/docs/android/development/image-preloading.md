# Image Preloading (Android)

Android widgets have limitations when it comes to displaying remote images directly. The image preloading API allows you to download images to the app's cache directory, making them available to your widgets via a local `FileProvider`.

## Overview

The image preloading system on Android works by:

1. Downloading images from URLs to the internal app cache.
2. Making these images available to Voltra widgets via the `assetName` property.
3. Providing APIs to reload widgets when new images are ready.

## API Reference

### `preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult>`

Downloads images to the Android cache for use in Widgets.

```typescript
type PreloadImageOptions = {
  url: string // The URL to download the image from
  key: string // The assetName to use when referencing this image
  method?: 'GET' | 'POST' | 'PUT' // HTTP method (default: 'GET')
  headers?: Record<string, string> // Optional HTTP headers
}

type PreloadImagesResult = {
  succeeded: string[] // Keys of successfully downloaded images
  failed: { key: string; error: string }[] // Failed downloads with error messages
}
```

**Example:**

```typescript
import { preloadImages } from 'voltra/android'

const result = await preloadImages([
  {
    url: 'https://example.com/album-art.jpg',
    key: 'current-album',
    headers: { Authorization: 'Bearer token' },
  },
])

if (result.succeeded.includes('current-album')) {
  // Images are ready to be used in widgets
}
```

### `reloadWidgets(widgetIds?: string[]): Promise<void>`

Reloads Android widgets to pick up newly preloaded images. If no `widgetIds` are provided, all active widgets will be reloaded.

```typescript
import { reloadWidgets } from 'voltra/android'

// Reload all widgets
await reloadWidgets()

// Reload specific widgets
await reloadWidgets(['weather_widget'])
```

### `clearPreloadedImages(keys?: string[]): Promise<void>`

Removes preloaded images from the Android cache. If no `keys` are provided, all preloaded images will be cleared.

```typescript
import { clearPreloadedImages } from 'voltra/android'

// Clear specific images
await clearPreloadedImages(['current-album'])

// Clear all preloaded images
await clearPreloadedImages()
```

## Usage in Android Widgets

Once images are preloaded, reference them using the `assetName` property in the `VoltraAndroid.Image` component:

```tsx
import { VoltraAndroid } from 'voltra'

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
