# Image Preloading

This page provides detailed API documentation for Voltra's image preloading system. For an overview of all image handling approaches in Live Activities, see the [Images](images) documentation.

Live Activities have strict size limits (4KB per update), which makes displaying remote images challenging. The image preloading API downloads images to shared App Group storage, making them available to both your app and Live Activities.

## Overview

The image preloading system works by:

1. Downloading images from URLs to App Group shared storage
2. Validating that images are under the 4KB ActivityKit limit
3. Making images available to Live Activities via the `assetName` property
4. Providing APIs to reload existing Live Activities when new images are available

## API Reference

### `preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult>`

Downloads bitmap images to App Group storage or rasterizes SVGs to PNG before storing them for use in Live Activities.

Each item must be either a URL preload (`url`) or an SVG preload (`svg`). The TypeScript types express this as a union of two variants:

```typescript
type PreloadImageUrlOptions = {
  key: string // The assetName to use when referencing this image
  url: string // URL to download the image from
  method?: 'GET' | 'POST' | 'PUT' // HTTP method (default: 'GET')
  headers?: Record<string, string> // Optional HTTP headers
  width?: number
  height?: number
}

type PreloadImageSvgOptions = {
  key: string // The assetName to use when referencing this image
  svg: string // Inline SVG markup to rasterize and cache as PNG
  width?: number // Typically required for SVG rasterization (see native errors if omitted)
  height?: number
}

type PreloadImageOptions = PreloadImageUrlOptions | PreloadImageSvgOptions

type PreloadImageFailure = {
  key: string
  error: string
}

type PreloadImagesResult = {
  succeeded: string[] // Keys of successfully downloaded images
  failed: PreloadImageFailure[] // Failed downloads with error messages
}
```

**Example:**

```typescript
import { preloadImages } from '@use-voltra/ios-client'

const result = await preloadImages([
  {
    url: 'https://example.com/album-art.jpg',
    key: 'current-song-artwork',
    headers: { Authorization: 'Bearer token' },
  },
  {
    key: 'status-icon-active',
    svg: '<svg viewBox="0 0 24 24"><path fill="#34C759" d="..." /></svg>',
    width: 24,
    height: 24,
  },
])

console.log('Succeeded:', result.succeeded)
console.log('Failed:', result.failed)
```

### `reloadLiveActivities(activityNames?: string[]): Promise<void>`

Reloads Live Activities to pick up newly preloaded images. If no `activityNames` are provided, all active Live Activities will be reloaded.

```typescript
import { reloadLiveActivities } from '@use-voltra/ios-client'

// Reload all Live Activities
await reloadLiveActivities()

// Reload specific activities
await reloadLiveActivities(['music-player', 'order-tracker'])
```

### `clearPreloadedImages(keys?: string[]): Promise<void>`

Removes preloaded images from App Group storage. If no `keys` are provided, all preloaded images will be cleared.

```typescript
import { clearPreloadedImages } from '@use-voltra/ios-client'

// Clear specific images
await clearPreloadedImages(['album-art', 'profile-pic'])

// Clear all preloaded images
await clearPreloadedImages()
```

## Usage in Live Activities

Once images are preloaded, reference them using the `assetName` property:

```typescript
import { Voltra } from '@use-voltra/ios'

function MusicPlayerLiveActivity({ song }) {
  return {
    lockScreen: (
      <Voltra.VStack style={{ padding: 16 }}>
        <Voltra.Image
          source={{ assetName: 'current-song-artwork' }}
          style={{ width: 60, height: 60, borderRadius: 8 }}
        />
        <Voltra.Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 8 }}>
          {song.title}
        </Voltra.Text>
        <Voltra.Text style={{ color: '#666', fontSize: 14 }}>
          {song.artist}
        </Voltra.Text>
      </Voltra.VStack>
    )
  }
}
```

## Size Validation

ActivityKit enforces a 4KB limit per Live Activity update. Images are validated both before and after download:

- **Content-Length header**: If available, images larger than 4KB are rejected before download
- **Actual size**: After download, the actual data size is validated
- **SVG rasterization**: SVG inputs are converted to PNG before storage and the generated PNG is size-checked
- **Image validation**: Ensures the downloaded data is a valid image format

Images that exceed 4KB will result in a preload failure with a descriptive error message.

## Error Handling

The `preloadImages` function provides detailed error information:

```typescript
const result = await preloadImages([
  { url: 'https://example.com/large-image.jpg', key: 'big-image' },
  { url: 'https://invalid-url.com/image.jpg', key: 'broken-url' },
])

// Handle results
if (result.failed.length > 0) {
  result.failed.forEach(({ key, error }) => {
    console.error(`Failed to preload ${key}: ${error}`)
  })
}

// Only proceed if all images succeeded
if (result.succeeded.length === 2) {
  await reloadLiveActivities()
}
```

## Common Error Messages

- `"Image 'key-name' is too large: 5120 bytes (max 4096 bytes for Live Activities)"` - Image exceeds 4KB limit
- `"Invalid image data for 'key-name'"` - Downloaded data is not a valid image
- `"Invalid SVG data for 'key-name'"` - SVG markup is malformed or contains unsupported external/script references
- `"SVG 'key-name' requires positive width and height"` - SVG rasterization needs explicit dimensions
- `"HTTP error: 404"` - Server returned an error status code
- `"App Group not configured"` - Missing App Group configuration in the config plugin

## Configuration

Image preloading requires App Group configuration in your Expo config plugin:

```json
{
  "plugins": [
    [
      "@use-voltra/ios-client",
      {
        "groupIdentifier": "group.your.app"
      }
    ]
  ]
}
```
