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

- iOS UI namespace: `Voltra` from `voltra`
- Android UI namespace for Android-only code: `VoltraAndroid` from `voltra/android`
- iOS runtime API entrypoint: `voltra/client`
- iOS server rendering entrypoint: `voltra/server`
- Android runtime API entrypoint: `voltra/android/client`
- Android-only package entrypoints exist: `voltra/android`, `voltra/android/client`, `voltra/android/server`

Default rule:

- For new Android-only code, prefer `voltra/android` and `voltra/android/client`.
- If existing project code already uses `VoltraAndroid` from `voltra`, matching that local pattern can be acceptable for consistency.
- Use `use-voltra.dev` for documentation lookups.
