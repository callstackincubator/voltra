# @use-voltra/ios-client

## 2.2.0

### Minor Changes

- 42996c5: Add typed, JSON-serializable runtime-props update APIs for entry-based Dynamic Widgets on both platforms:

  - Android adds `updateAndroidDynamicWidget`, persists the latest props per widget ID in private `SharedPreferences`, passes them into the Hermes render path, and refreshes only matching Glance receiver instances.
  - iOS adds `updateDynamicWidget`, persists the latest props per widget ID in App Group `UserDefaults`, passes them into the JavaScriptCore/WidgetKit render path, and reloads only the matching WidgetKit kind.

  Both platforms default to `{}` when no props are stored. On iOS, configure `groupIdentifier` so the app and WidgetKit extension can share runtime props. Rebuild the native Android and iOS apps after upgrading so the new TurboModule methods and native props persistence are included.

- 691b43f: Restructure the widget Xcode integration and fix signing, versioning, and misconfiguration behavior.

  - Widget code signing now mirrors the main app per build configuration (Debug→Debug,
    Release→Release) instead of copying the first configuration's settings into both, so
    manual-signing release builds get the correct provisioning profile.
  - The widget's `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` now follow `expo.version`
    and `expo.ios.buildNumber` (falling back to the previous `1.0`/`1` when unset), matching
    App Store Connect's requirement that an appex version match its host app.
  - The plugin now throws an actionable error when `expo.ios.bundleIdentifier` is missing
    instead of silently skipping widget setup.
  - Internally, target setup is collapsed into a single idempotent ensure pipeline and build
    phases are matched semantically rather than by comment strings.

### Patch Changes

- 97aefe4: Harden the generated Podfile widget-target block.

  The block is now delimited by `# @voltra-widget-target BEGIN/END` markers and upserted
  idempotently (legacy unmarked blocks are migrated, renamed targets update in place). The
  embedded Ruby raises an actionable error when `@use-voltra/ios-client` cannot be resolved
  instead of generating a broken target, and the podspec path is canonicalized with
  `File.realpath` so pnpm and bun symlinked installs resolve correctly.

- 121fa8d: Fix Xcode project corruption when the app already contains another app extension.

  The config plugin now scopes all pbxproj mutations to the widget's own objects: file
  references resolve through the widget's PBXGroup instead of by bare path, build phases are
  created empty and populated without adopting other targets' PBXBuildFiles, and an existing
  "Embed App Extensions" phase is reused (detected via `dstSubfolderSpec == 13`) instead of
  duplicated. Resolves the `[Xcodeproj] Consistency issue: no parent for object` and
  `Cycle inside <target>` failures during `pod install`, and makes repeated `expo prebuild`
  runs idempotent.

  - @use-voltra/compiler@2.2.0
  - @use-voltra/expo-plugin@2.2.0
  - @use-voltra/ios@2.2.0

## 2.0.0

### Major Changes

- 3833dfe: **Breaking change.** Voltra’s iOS native code now requires a **minimum deployment target of iOS 16.4** (bumped from the previous minimum). Raise it everywhere it matters (Xcode targets, `expo-build-properties`, CocoaPods, and CI), so you are not still building for 16.3 or lower.

  This release also brings **Expo SDK 56** compatibility; you can upgrade Expo on your own timeline and you **do not** need to be on SDK 56 before adopting this Voltra version.

### Minor Changes

- 9a0857d: Add an `accentedRenderingMode` prop to the iOS `Image` component for iOS 18+ Home Screen widgets. When the widget renders in `accented` or `vibrant` mode, the prop maps to SwiftUI's `widgetAccentedRenderingMode(_:)` so consumers can opt individual images out of the system's default desaturation (e.g. pass `"fullColor"` to keep an image's original colors over the tinted backdrop). It is a no-op on iOS &lt; 18, in Live Activities, and in `fullColor` widget mode.

### Patch Changes

- ef9f1da: Add a reactive `useIsHeadless()` helper for iOS headless launches and update iOS headless launch handling so apps can render again when users open them from a background launch.
- Updated dependencies [3833dfe]
- Updated dependencies [9a0857d]
- Updated dependencies [948eb15]
  - @use-voltra/expo-plugin@2.0.0
  - @use-voltra/ios@2.0.0

## 1.4.1

### Patch Changes

- a5a315b: Fix `maxLines` text truncation on Android widgets so line limits apply correctly.
- iOS home screen widgets now match Tinted and Clear system appearances: no more default opaque white card behind your widget, with colors and gradients adjusted so content stays readable.
- Updated dependencies [a5a315b]
- Updated dependencies
  - @use-voltra/ios@1.4.1

## 1.4.0

### Minor Changes

- Work on decomposing Voltra into smaller packages continues, and more pieces have moved from the umbrella package into the respective `@use-voltra/*` packages. You should still use the `voltra` umbrella for your app.

### Patch Changes

- Updated dependencies
  - @use-voltra/ios@1.4.0
