# iOS Live Activities

Use this reference for iOS Live Activity UI or lifecycle APIs.

## Domain Rules

- Use `Voltra` from `voltra` for Live Activity UI trees.
- Use `voltra/client` for runtime APIs such as `useLiveActivity`, `startLiveActivity`, `updateLiveActivity`, `stopLiveActivity`, and Voltra event listeners.
- Do not use `VoltraAndroid` or Android widget primitives in iOS Live Activity code.
- Use valid iOS variant keys: `lockScreen`, `island`, and `supplementalActivityFamilies`.
- For images, use `Voltra.Image` with either a bundled `assetName` or a preloaded image key. Use `preloadImages` and `reloadLiveActivities` from `voltra/client` for runtime images.
- If the task involves APNS, push tokens, push-to-start, channel IDs, or backend-driven updates, also read `ios-server-updates.md`.

## Preferred APIs

- `useLiveActivity`
- `startLiveActivity`
- `updateLiveActivity`
- `stopLiveActivity`
- `endAllLiveActivities`
- `addVoltraListener`
- `VoltraView`
- `VoltraLiveActivityPreview`

## Sources

- `variant-shapes.md`
