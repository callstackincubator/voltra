# Images

Live Activities have strict size limits (4KB per update), making image handling a critical optimization area. Voltra provides three different approaches for including images in your Live Activities, each with different trade-offs and use cases:

- **Base64 encoding**: Best for small, static images (< 1KB)
- **Build-time asset copying**: Best for medium-sized images that are known at build time
- **Runtime preloading**: Best for dynamic images from remote URLs or inline SVG data

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

Images must be under 4KB (the ActivityKit limit) — anything larger fails the build. You can then reference these images using their assetName:

```tsx
<Voltra.Image source={{ assetName: 'logo.png' }} />
<Voltra.Image source={{ assetName: 'icon-star.png' }} />
```

## Runtime preloading

For dynamic images from remote URLs or inline SVG markup, use Voltra's image preloading API to cache images (also subject to the 4KB limit) in App Group shared storage, then reference them the same way via `assetName`. See [Image Preloading](image-preloading) for the full API and a usage example.

## Comparison table

| Approach   | Image Size | When Known | Dynamic | Setup Required   | Payload Impact      |
| ---------- | ---------- | ---------- | ------- | ---------------- | ------------------- |
| Base64     | < 1KB      | Build time | No      | None             | High (encoded size) |
| Build-time | 1KB - 4KB  | Build time | No      | File placement   | Low (filename only) |
| Preloading | 1KB - 4KB  | Runtime    | Yes     | App Group config | Low (filename only) |
