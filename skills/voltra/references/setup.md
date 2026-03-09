# Setup

Use this reference when the task is about bootstrapping or installation.

## Domain Rules

- Voltra is not supported in Expo Go. Use Expo Dev Client or a native build.
- Start with the Voltra package, Expo config plugin, and `expo prebuild`.
- If setup also requires widget registration or push settings, also read `app-config.md`.

## Setup Flow

1. Install `voltra`.
2. Add the Voltra plugin to `app.json` or `app.config.*`.
3. For iOS, ensure the deployment target meets Voltra's minimum supported version.
4. Run `expo prebuild` for the target platform.
5. Continue with the relevant platform reference.

## Sources

- `source-of-truth.md`
- `https://use-voltra.dev/ios/setup`
- `https://use-voltra.dev/android/setup`
