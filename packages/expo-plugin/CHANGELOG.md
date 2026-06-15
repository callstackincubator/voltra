# @use-voltra/expo-plugin

## 2.0.0

### Major Changes

- 3833dfe: **Breaking change.** Voltra’s iOS native code now requires a **minimum deployment target of iOS 16.4** (bumped from the previous minimum). Raise it everywhere it matters (Xcode targets, `expo-build-properties`, CocoaPods, and CI), so you are not still building for 16.3 or lower.

  This release also brings **Expo SDK 56** compatibility; you can upgrade Expo on your own timeline and you **do not** need to be on SDK 56 before adopting this Voltra version.

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
