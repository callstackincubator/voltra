# Runtime API Checklist

Use Android-specific Voltra widget APIs when possible.

Widget runtime entrypoint:

- `voltra/android/client`

Use these for widgets:

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

Do not claim a full Android server-push architecture unless the task is directly supported by current Voltra JS APIs and docs.
