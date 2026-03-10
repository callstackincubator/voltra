# App Config

Use this reference for Voltra plugin configuration.

## Domain Rules

- Update `app.json` or `app.config.*` before writing widget code that depends on registration, previews, or initial state files.
- For iOS push updates, require `enablePushNotifications: true`.
- For Android widgets, define them under `android.widgets` in the Voltra plugin config.
- For server-driven widgets, configure `serverUpdate` on the widget entry itself and rebuild after config changes.
- Only mention preview XML when the user is explicitly editing an existing Android widget preview layout supported by Voltra.
- Do not invent unsupported plugin keys.
- If the task is about iOS image preloading, check whether `groupIdentifier` is needed for the intended Voltra surface and storage flow.
- If the task is about authenticated iOS server-driven widgets, check whether `keychainGroup` is needed for shared credentials.

## Working Rules

- iOS-oriented plugin keys live at the top level of the Voltra plugin config.
- Android widget registration lives under `android.widgets`.
- Use `groupIdentifier` when the app needs extension data sharing or forwarded interactions.
- Use `keychainGroup` when iOS widgets need authenticated server-driven updates and the default derived group is not sufficient.
- If the task includes iOS widget UI or `supportedFamilies`, also read `ios-widgets.md`.
- If the task includes Android widget UI, also read `android-widgets.md`.
- If the task includes iOS server updates, also read `ios-server-updates.md`.
- If the task includes `serverUpdate`, widget polling, or widget auth credentials, also read `server-driven-widgets.md`.

## Sources

- `plugin-schema.md`
