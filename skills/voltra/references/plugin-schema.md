# Plugin Schema

Voltra plugin config lives under `expo.plugins`.

## iOS Plugin Schema

Use `@use-voltra/ios-client` for iOS config.

- `groupIdentifier`
- `enablePushNotifications`
- `widgets`
- `fonts`
- `deploymentTarget`
- `targetName`

### iOS Widget Schema

Use top-level `widgets` for iOS widget gallery registration.

- `id`: unique identifier, use alphanumeric and underscores only
- `displayName` (string or per-locale map)
- `description` (string or per-locale map)
- `supportedFamilies`: array of iOS families such as `systemSmall`, `systemMedium`, `systemLarge`
- `initialStatePath` (string or per-locale map of paths for localized pre-render)
- `serverUpdate.url`: widget endpoint, Voltra appends `widgetId`, `platform=ios`, `family`, `theme`, and `locale`. Optional; omit it to supply the URL at runtime with `setWidgetServerUpdate`
- `serverUpdate.intervalMinutes`: polling interval, default `15`, subject to WidgetKit throttling. With `entry`, floor and default are both `15`
- `serverUpdate.refresh`: native refresh button, default `false`
- `entry` plus `serverUpdate`: server returns plain JSON props rather than a rendered payload; requires `groupIdentifier`. `family` is not sent

Other important Apple-side keys:

- `groupIdentifier`: needed for shared storage, forwarded interactions, and image preloading
- `enablePushNotifications`: required for APNS-driven Live Activity updates
- `deploymentTarget`: widget extension deployment target
- `targetName`: custom Apple widget extension target name
- `keychainGroup`: shared credential group for authenticated server-driven widgets; auto-derived when omitted and iOS widgets use `serverUpdate`

## Android Plugin Schema

Use `@use-voltra/android-client` for Android config.

- `enableNotifications`
- `widgets`
- `fonts`

### Android Widget Schema

- `id`: unique identifier, use alphanumeric and underscores only
- `displayName` (string or per-locale map)
- `description` (string or per-locale map)
- `targetCellWidth`
- `targetCellHeight`
- `minWidth`
- `minHeight`
- `minCellWidth` (deprecated, prefer `minWidth`)
- `minCellHeight` (deprecated, prefer `minHeight`)
- `minResizeWidth`
- `minResizeHeight`
- `maxResizeWidth` (Android 12+)
- `maxResizeHeight` (Android 12+)
- `resizeMode`
- `widgetCategory`
- `initialStatePath` (string or per-locale map of paths)
- `serverUpdate.url`: widget endpoint, Voltra appends `widgetId`, `platform=android`, `theme`, and `locale`. Optional; omit it to supply the URL at runtime with `setWidgetServerUpdate`
- `serverUpdate.intervalMinutes`: polling interval, default `60`; use at least 15 minutes. With `entry`, floor and default are both `15`
- `serverUpdate.refresh`: native refresh button, default `false`
- `entry` plus `serverUpdate`: server returns plain JSON props rather than a rendered payload. `family` is not sent
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
