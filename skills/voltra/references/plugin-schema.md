# Plugin Schema

Voltra plugin config lives under `expo.plugins`.

## Common Top-Level Keys

- `groupIdentifier`
- `enablePushNotifications`
- `liveActivity`
- `widgets`
- `fonts`
- `android`
- `deploymentTarget`
- `targetName`

## iOS Widget Schema

Use top-level `widgets` for iOS widget gallery registration.

- `id`: unique identifier, use alphanumeric and underscores only
- `displayName`
- `description`
- `supportedFamilies`: array of iOS families such as `systemSmall`, `systemMedium`, `systemLarge`
- `initialStatePath`
- `serverUpdate.url`: widget endpoint, Voltra appends `widgetId`, `platform=ios`, and `family`
- `serverUpdate.intervalMinutes`: polling interval, default `15`, subject to WidgetKit throttling

Other important Apple-side keys:

- `groupIdentifier`: needed for shared storage, forwarded interactions, and image preloading
- `enablePushNotifications`: required for APNS-driven Live Activity updates
- `deploymentTarget`: widget extension deployment target
- `targetName`: custom Apple widget extension target name
- `keychainGroup`: shared credential group for authenticated server-driven widgets; auto-derived when omitted and iOS widgets use `serverUpdate`

## Android Widget Schema

Use `android.widgets` for Android widget registration.

- `id`: unique identifier, use alphanumeric and underscores only
- `displayName`
- `description`
- `targetCellWidth`
- `targetCellHeight`
- `minCellWidth`
- `minCellHeight`
- `minWidth`
- `minHeight`
- `resizeMode`
- `widgetCategory`
- `initialStatePath`
- `serverUpdate.url`: widget endpoint, Voltra appends `widgetId` and `platform=android`
- `serverUpdate.intervalMinutes`: polling interval; use at least 15 minutes
- `previewImage`
- `previewLayout`

## Decision Rules

- If the task asks for Apple widget gallery registration or `supportedFamilies`, stay in config first and then read `ios-widgets.md`.
- If the task asks for Android widget picker metadata, stay in config first and then read `android-widgets.md`.
- If the task asks for pre-rendered initial widget content, add `initialStatePath` and then move to the target widget reference.
- If the task asks for APNS-driven Live Activity updates, ensure `enablePushNotifications` is present and then move to `ios-server-updates.md`.
- If the task asks for iOS image preloading or shared extension images, check `groupIdentifier` before moving on to UI code.
- If the task asks for widget polling, widget SSR endpoints, or widget auth credentials, configure `serverUpdate` first and then move to `server-driven-widgets.md`.

## Hosted Docs

Consult `source-of-truth.md` for the canonical hosted doc list.
