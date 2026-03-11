# Server-driven Widgets

Use this reference for Voltra widgets that fetch content from your server on a schedule.

## Domain Rules

- This flow is for Home Screen widgets, not APNS Live Activity updates.
- Configure `serverUpdate` in the Voltra plugin config before writing widget server code.
- Rebuild native apps after adding or changing `serverUpdate`, `keychainGroup`, or widget registration.
- Use `createWidgetUpdateHandler`, `createWidgetUpdateNodeHandler`, or `createWidgetUpdateExpressHandler` from `voltra/server` for the server endpoint.
- Use `setWidgetServerCredentials` after login and `clearWidgetServerCredentials` on logout when the endpoint requires auth.
- If the endpoint is public, skip credential storage entirely.
- Keep render paths platform-specific: `renderIos` returns iOS `WidgetVariants`; `renderAndroid` returns Android size variants.
- Keep a meaningful `initialStatePath` so the widget has placeholder content before the first successful fetch.

## Request and Response Rules

- Voltra appends `widgetId` and `platform` to every request.
- iOS requests also include `family`.
- `WidgetRenderRequest` includes `widgetId`, `platform`, `family`, `token`, and `headers`.
- If `validateToken` is provided, missing or invalid bearer tokens should reject with `401`.
- Return `null` from the platform render function to produce `404` for unsupported widget IDs or unavailable content.

## Platform Notes

- iOS widgets are polled by WidgetKit. Treat intervals below about 15 minutes as advisory because the OS may throttle them.
- Android widgets are scheduled through WorkManager. Use at least 15 minutes and set the interval explicitly.
- On iOS, authenticated server-driven widgets may need `keychainGroup` so the widget extension can read credentials. If omitted, Voltra auto-derives a default when any iOS widget uses `serverUpdate`.
- On Android emulators, local servers usually need `10.0.2.2` instead of `localhost`.

## Preferred APIs

- `createWidgetUpdateHandler`
- `createWidgetUpdateNodeHandler`
- `createWidgetUpdateExpressHandler`
- `setWidgetServerCredentials`
- `clearWidgetServerCredentials`
- `reloadWidgets`

## Sources

- `ios-widgets.md`
- `android-widgets.md`
- `app-config.md`
- `plugin-schema.md`
