# Android Widgets

Use this reference for Android Voltra widget UI or Android widget runtime APIs.

## Domain Rules

- Use `VoltraAndroid` for Android Voltra UI.
- For new Android-only code, prefer `VoltraAndroid` from `voltra/android` and runtime APIs from `voltra/android/client`.
- Do not use `Voltra.VStack`, `Voltra.HStack`, or plain React Native primitives inside Android Voltra widget trees.
- Do not claim APNS or undocumented FCM server-update support for Android.
- If the task includes widget registration, picker previews, or initial state files, also read `app-config.md`.
- For images, use `VoltraAndroid.Image` with build-time `assetName`s or preloaded keys. Use `preloadImages`, `reloadWidgets`, and `clearPreloadedImages` from `voltra/android/client` for runtime images.

## Preferred APIs

- `updateAndroidWidget`
- `reloadAndroidWidgets`
- `clearAndroidWidget`
- `clearAllAndroidWidgets`
- `requestPinAndroidWidget`
- `getActiveWidgets`
- `VoltraWidgetPreview`
- `VoltraView`
- `preloadImages`
- `reloadWidgets`
- `clearPreloadedImages`

## Sources

- `component-mapping.md`
- `runtime-api-checklist.md`
