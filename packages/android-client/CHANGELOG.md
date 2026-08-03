# @use-voltra/android-client

## 2.2.0

### Minor Changes

- 42996c5: Add typed, JSON-serializable runtime-props update APIs for entry-based Dynamic Widgets on both platforms:

  - Android adds `updateAndroidDynamicWidget`, persists the latest props per widget ID in private `SharedPreferences`, passes them into the Hermes render path, and refreshes only matching Glance receiver instances.
  - iOS adds `updateDynamicWidget`, persists the latest props per widget ID in App Group `UserDefaults`, passes them into the JavaScriptCore/WidgetKit render path, and reloads only the matching WidgetKit kind.

  Both platforms default to `{}` when no props are stored. On iOS, configure `groupIdentifier` so the app and WidgetKit extension can share runtime props. Rebuild the native Android and iOS apps after upgrading so the new TurboModule methods and native props persistence are included.

### Patch Changes

- 46fdec0: Respect Android ABI selections and avoid bundling duplicate Hermes libraries.
- 6fc0177: Android client native libraries now support 16 KB page sizes required by Android 15 and Google Play.
- 5cc2189: Fix Android builds for React Native 0.81 apps by linking the correct Hermes prefab target.
- Updated dependencies [6ee694b]
  - @use-voltra/android@2.2.0
  - @use-voltra/compiler@2.2.0
  - @use-voltra/expo-plugin@2.2.0

## 2.0.0

### Patch Changes

- Updated dependencies [3833dfe]
- Updated dependencies [948eb15]
- Updated dependencies [1e014f1]
  - @use-voltra/expo-plugin@2.0.0
  - @use-voltra/android@2.0.0

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/android@1.4.1

## 1.4.0

### Minor Changes

- Work on decomposing Voltra into smaller packages continues, and more pieces have moved from the umbrella package into the respective `@use-voltra/*` packages. You should still use the `voltra` umbrella for your app.

### Patch Changes

- Updated dependencies
- Updated dependencies [14d4fa5]
- Updated dependencies
  - @use-voltra/android@1.4.0
