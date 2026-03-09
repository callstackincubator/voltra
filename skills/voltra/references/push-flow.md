# Push Flow

Use this flow for iOS Live Activity server-driven updates:

1. Enable `enablePushNotifications: true` in the Voltra plugin config.
2. Start the Live Activity or subscribe to token events in the app.
3. Capture Voltra push tokens with `addVoltraListener` from `voltra/client`.
4. Send the token or channel identifier to your backend.
5. Render the Live Activity UI payload with `renderLiveActivityToString` from `voltra/server`.
6. Send the APNS request with the Voltra-generated UI JSON in the payload.

Important concepts:

- Update token: update an existing Live Activity.
- Push-to-start token: start a Live Activity remotely.
- `channelId`: subscribe to broadcast updates on supported iOS versions.
- APNS headers must match Live Activity requirements.
- Keep payloads small.

Use these sources first:

- `source-of-truth.md`
- `https://use-voltra.dev/ios/development/server-side-updates`
- `https://use-voltra.dev/ios/development/events`
- `https://use-voltra.dev/ios/api/configuration`

Do not extend this flow to Android unless new repo docs and APIs clearly support it.
