# Setup

Use this reference when the task is about bootstrapping or installation.

## Domain Rules

- Voltra is not supported in Expo Go. Use Expo Dev Client or a native build.
- Install the matching platform package(s) and client package(s), then configure the matching Expo plugin and run `expo prebuild`.
- If setup also requires widget registration, push settings, or React Native CLI workflow, also read the relevant follow-up reference.

## Setup Flow

1. Install `@use-voltra/ios` and `@use-voltra/ios-client` and/or `@use-voltra/android` and `@use-voltra/android-client`.
2. Add the matching client plugin(s) to `app.json` or `app.config.*`.
3. For iOS, ensure the deployment target meets Voltra's minimum supported version.
4. Run `expo prebuild` for the target platform, or use `voltra apply` if you are on React Native CLI.
5. Continue with the relevant platform reference.

## Sources

- `source-of-truth.md`
- `https://use-voltra.dev/ios/setup`
- `https://use-voltra.dev/android/setup`
- `react-native-cli.md`
