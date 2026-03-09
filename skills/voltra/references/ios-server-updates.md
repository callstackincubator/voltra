# iOS Server Updates

Use this reference for APNS-driven Live Activity updates.

## Domain Rules

- This flow is iOS-only.
- Require `enablePushNotifications: true` in the Voltra plugin config.
- Use Voltra event APIs from `voltra/client` to collect tokens.
- Use `voltra/server` to render Live Activity payloads.
- Use Voltra-generated UI JSON in APNS payloads.
- Do not extrapolate this APNS flow to Android unless Voltra provides a documented JS API and guide for that exact use case.
- If the task also defines or changes Live Activity UI, also read `ios-live-activities.md`.

## Preferred APIs

- `addVoltraListener`
- `startLiveActivity`
- `useLiveActivity`
- `renderLiveActivityToString`
- `Voltra` from `voltra/server`

## Sources

- `push-flow.md`
