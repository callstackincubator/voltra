# Images

Voltra supports three image paths:

- build-time assets
- runtime preloading
- base64 for very small generated images

## Build-Time Assets

Use build-time assets when the image is known at build time.

- iOS: place files under `assets/voltra/`
- Android: place files under `assets/voltra-android/`

Reference bundled assets with `assetName`.

Examples:

- iOS: `<Voltra.Image source={{ assetName: 'logo.png' }} />`
- Android: `<VoltraAndroid.Image source={{ assetName: 'logo' }} />`

Android notes:

- Android resource names are sanitized to lowercase underscore names.
- Do not include the file extension in Android `assetName`.

## Runtime Preloading

Use preloading when the image comes from a remote URL or runtime data.

- iOS preloading API: `preloadImages`, `reloadLiveActivities`, `clearPreloadedImages` from `voltra/client`
- Android preloading API: `preloadImages`, `reloadWidgets`, `clearPreloadedImages` from `voltra/android/client`

After preloading, reference the image with the same `key` via `assetName`.

## Platform Rules

- iOS Live Activities and iOS widgets use `Voltra.Image`.
- Android widgets and Android live updates use `VoltraAndroid.Image`.
- iOS image preloading depends on App Group-backed shared storage, so config tasks may also need `groupIdentifier`.
- Android image preloading uses app cache plus Voltra's local delivery path; do not invent a native image pipeline.

## Base64

Use base64 only for very small inline images. Prefer build-time assets or preloading for anything non-trivial.

## Sources

- `source-of-truth.md`
