# React Native CLI

Use this reference for Voltra in React Native CLI projects.

## Domain Rules

- Voltra support for React Native CLI projects is experimental.
- Install the same platform packages you would use in Expo, plus the `voltra` CLI as a dev dependency.
- Use `voltra apply` instead of Expo config plugins to update the native project.
- Use the platform docs for shared config fields, then reapply after every config change.

## Setup Flow

1. Install `@use-voltra/ios` and `@use-voltra/ios-client` and/or `@use-voltra/android` and `@use-voltra/android-client`.
2. Install `voltra` as a dev dependency.
3. Create `voltra.config.ts`.
4. Run `voltra apply` after changing the config.
5. Continue with the relevant platform docs.

## Configuration

Most shared config lives in `voltra.config.ts`.

- `projectRoot`
- `ios.userImagesPath`
- `ios.project`
- `android.userImagesPath`
- `android.project`

For platform-specific config details, use:

- `https://use-voltra.dev/ios/api/plugin-configuration`
- `https://use-voltra.dev/android/api/plugin-configuration`

## Sources

- `https://use-voltra.dev/getting-started/react-native-cli`
- `https://use-voltra.dev/getting-started/installation`
