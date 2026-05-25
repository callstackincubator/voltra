# Source Of Truth

Use this file as the compact local source of truth for Voltra behavior. For deeper documentation, use hosted docs on `use-voltra.dev`.

Hosted docs to use for guidance:

- `https://use-voltra.dev/ios/setup`
- `https://use-voltra.dev/android/setup`
- `https://use-voltra.dev/ios/development/developing-live-activities`
- `https://use-voltra.dev/ios/development/developing-widgets`
- `https://use-voltra.dev/ios/development/images`
- `https://use-voltra.dev/ios/development/image-preloading`
- `https://use-voltra.dev/ios/development/server-side-updates`
- `https://use-voltra.dev/android/development/developing-widgets`
- `https://use-voltra.dev/android/development/images`
- `https://use-voltra.dev/android/development/image-preloading`
- `https://use-voltra.dev/android/api/plugin-configuration`

Core facts:

- iOS app install: `@use-voltra/ios-client` (re-exports `Voltra` and runtime APIs)
- Android app install: `@use-voltra/android-client` (re-exports `VoltraAndroid` and runtime APIs)
- iOS server rendering entrypoint: `@use-voltra/ios-server`
- Android server rendering entrypoint: `@use-voltra/android-server`
- Cross-platform widget HTTP handlers: `@use-voltra/server`
- iOS Expo plugin: `@use-voltra/ios-client`
- Android Expo plugin: `@use-voltra/android-client`

Default rule:

- Install only the `@use-voltra/*` client packages you need for app runtime code.
- Widget `initialStatePath` modules run in Node during prebuild: import from `@use-voltra/ios` or `@use-voltra/android`, not the `-client` packages.
- Use `use-voltra.dev` for documentation lookups.
