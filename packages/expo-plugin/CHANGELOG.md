# @use-voltra/expo-plugin

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.

## 1.4.0

### Minor Changes

- 14d4fa5: Add Android ongoing notification support, including richer notification content, remote update flows, and server-side payload rendering APIs. This release also expands the Expo integration and documentation so apps can configure, send, and manage Android ongoing notifications more easily.

## 1.3.0

### Patch Changes

- 68271bb: Fix `pod install` failing with "multiple dependencies with different sources for VoltraWidget" when using pnpm or bun (symlinked node_modules). The plugin now resolves the VoltraWidget path to its real path so CocoaPods sees a single source.
