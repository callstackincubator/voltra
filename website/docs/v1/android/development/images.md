# Images

Voltra provides three different approaches for including images in your Android widgets, each with different trade-offs and use cases:

- **Build-time asset copying**: Best for static icons and assets known at build time
- **Runtime preloading**: Best for dynamic images from remote URLs
- **Base64 encoding**: Best for small, generated images

## Build-time asset copying

Place images in the `/assets/voltra-android/` directory and they'll be automatically processed and copied to the Android drawable resources during build.

```
project-root/
├── assets/
│   └── voltra-android/
│       ├── logo.png
│       ├── weather/
│       │   ├── sunny.svg
│       │   └── rainy.xml
│       └── background.webp
```

Here's how build-time asset copying works:

1.  Images in `/assets/voltra-android/` are automatically detected during build (run `npx expo prebuild` to apply changes).
2.  Filenames are sanitized to be compatible with Android resource naming rules (lowercase, underscores only).
3.  SVGs are automatically converted to Android Vector Drawables (XML).
4.  Images are copied to `res/drawable/` in the native Android project.

### Naming & Sanitization

Android drawable resources have strict naming conventions. Voltra automatically handles this for you:

- **Sanitization:** Uppercase letters are converted to lowercase. Hyphens and other special characters are replaced with underscores.
- **Flattening:** Subdirectories are flattened into the resource name to avoid conflicts.

**Examples:**

| Source File | Android Resource Name |
| :--- | :--- |
| `assets/voltra-android/Logo.png` | `logo` |
| `assets/voltra-android/icons/My-Icon.png` | `icons_my_icon` |
| `assets/voltra-android/weather/sunny.svg` | `weather_sunny` |

### Supported Formats

- **Bitmap:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- **Vector:** `.svg` (converted to Vector Drawable), `.xml` (native Vector Drawable)

### Usage

Reference these images using their sanitized name in the `assetName` property. You do not need to include the file extension.

```tsx
import { VoltraAndroid } from 'voltra'

// assets/voltra-android/logo.png -> "logo"
<VoltraAndroid.Image
  source={{ assetName: 'logo' }}
  style={{ width: 48, height: 48 }}
/>

// assets/voltra-android/weather/sunny.svg -> "weather_sunny"
<VoltraAndroid.Image
  source={{ assetName: 'weather_sunny' }}
  style={{ width: 24, height: 24 }}
/>
```

## Runtime preloading

For dynamic images from remote URLs, use Voltra's image preloading API to cache images locally.

The image preloading system works by:

1.  Downloading images from URLs to the app's internal cache.
2.  Making images available to widgets via a local content provider.
3.  Providing APIs to reload widgets when new images are ready.

Once images are preloaded, reference them using the key you provided:

```tsx
import { VoltraAndroid } from 'voltra'

function ProfileWidget({ user }) {
  return (
    <VoltraAndroid.Row style={{ padding: 16 }}>
      <VoltraAndroid.Image
        source={{ assetName: 'user_avatar_123' }}
        style={{ width: 40, height: 40, borderRadius: 20 }}
      />
      <VoltraAndroid.Text style={{ marginLeft: 8 }}>
        {user.name}
      </VoltraAndroid.Text>
    </VoltraAndroid.Row>
  )
}
```

For detailed API documentation, see [Image Preloading](./image-preloading).

## Base64 encoding

You can also embed images directly as base64-encoded strings. This is useful for small, generated images or when you want to avoid file management for very simple assets.

```tsx
<VoltraAndroid.Image
  source={{
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  }}
  style={{ width: 20, height: 20 }}
/>
```

## Comparison table

| Approach | When Known | Dynamic | Setup Required | Performance |
| :--- | :--- | :--- | :--- | :--- |
| **Build-time** | Build time | No | File placement | Best (Native Resource) |
| **Preloading** | Runtime | Yes | Preload API call | Good (Cached File) |
| **Base64** | Runtime/Build | No | None | Fair (Memory intensive if large) |
