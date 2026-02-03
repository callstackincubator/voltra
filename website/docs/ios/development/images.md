# Images

Live Activities have strict size limits (4KB per update), making image handling a critical optimization area. Voltra provides three different approaches for including images in your Live Activities, each with different trade-offs and use cases:

- **Base64 encoding**: Best for small, static images (< 1KB)
- **Build-time asset copying**: Best for medium-sized images that are known at build time
- **Runtime preloading**: Best for dynamic images from remote URLs

## Base64 encoding

For extremely small images, you can embed them directly as base64-encoded strings in your JSX.

```tsx
<Voltra.Image
  source={{
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  }}
  style={{ width: 20, height: 20 }}
/>
```

## Build-time asset copying

Place images in the `/assets/voltra/` directory and they'll be automatically copied to the iOS extension bundle during build.

```
project-root/
├── assets/
│   └── voltra/
│       ├── logo.png
│       ├── icon-star.png
│       └── background-pattern.png
```

Here's how build-time asset copying works:

1. Images in `/assets/voltra/` are automatically detected during build
2. Each image is validated to be under 4KB (ActivityKit limit)
3. Images are copied to the Live Activity extension's `Assets.xcassets`
4. Xcode generates proper `.imageset` directories and metadata

You can then reference these images using their assetName:

```tsx
<Voltra.Image source={{ assetName: 'logo.png' }} />
<Voltra.Image source={{ assetName: 'icon-star.png' }} />
```

## Runtime preloading

For dynamic images from remote URLs, use Voltra's image preloading API to cache images in App Group shared storage.

The image preloading system works by:

1. Downloading images from URLs to App Group shared storage
2. Validating that images are under the 4KB ActivityKit limit
3. Making images available to Live Activities via the `assetName` property
4. Providing APIs to reload existing Live Activities when new images are available

Once images are preloaded, reference them using the `assetName` property:

```typescript
import { Voltra } from 'voltra'

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

For detailed API documentation, see [Image Preloading](image-preloading).

## Comparison table

| Approach   | Image Size | When Known | Dynamic | Setup Required   | Payload Impact      |
| ---------- | ---------- | ---------- | ------- | ---------------- | ------------------- |
| Base64     | < 1KB      | Build time | No      | None             | High (encoded size) |
| Build-time | 1KB - 4KB  | Build time | No      | File placement   | Low (filename only) |
| Preloading | 1KB - 4KB  | Runtime    | Yes     | App Group config | Low (filename only) |
