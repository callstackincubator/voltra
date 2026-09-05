# Server-driven widgets

Server-driven widgets allow your Android Home Screen widgets to periodically fetch fresh content from a remote server—without the user opening the app. This is powered by WorkManager, which handles scheduling, retries, and network constraints automatically.

Before you start, make sure the widget is registered in the Voltra plugin config and plan to rebuild the native app after adding or changing server-driven widget settings.

Android semantic color tokens from [`AndroidDynamicColors`](./dynamic-colors) work in server-rendered widgets too, so your backend can return dynamic Material roles instead of fixed hex values.

## How it works

1. You configure a `serverUpdate` URL in your Android widget's plugin config
2. WorkManager runs a periodic background task at the configured interval
3. Your server renders Voltra JSX components into a JSON payload
4. The worker parses the payload and pushes a `RemoteViews` update to the widget

Your app doesn't need to be running. WorkManager handles everything in the background.

A widget that also has an `entry` works the other way round: your server returns plain JSON data and the widget renders it on the device, so the backend can be written in any language. See [Returning data instead of UI](#returning-data-instead-of-ui).

## Plugin configuration

Add the `serverUpdate` option to your Android widget in `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/android-client",
        {
          "widgets": [
            {
              "id": "dynamic_weather",
              "displayName": "Dynamic Weather",
              "description": "Weather with live server updates",
              "targetCellWidth": 2,
              "targetCellHeight": 1,
              "serverUpdate": {
                "url": "https://api.example.com/widgets/render",
                "intervalMinutes": 60
              }
            }
          ]
        }
      ]
    ]
  }
}
```

**`serverUpdate` options:**

- `url`: The endpoint the widget fetches from. Voltra appends `widgetId`, `platform`, `theme`, and `locale` query parameters automatically (e.g. `?widgetId=dynamic_weather&platform=android&theme=dark&locale=en-US`). Optional — leave it out to mark the widget server-driven and supply the URL after login with [`setWidgetServerUpdate`](#changing-settings-at-runtime).
- `intervalMinutes`: How often the widget fetches updates. Defaults to `60`, or `15` for a widget that has an `entry`. The minimum is 15 minutes, which is as often as WorkManager will run periodic work.
- `refresh`: Whether to show a native refresh button in the top-right corner of the widget. When tapped, triggers an immediate server fetch. Defaults to `false`.

After updating plugin configuration, run `npx expo prebuild` if you're using Continuous Native Generation, then rebuild the app so the generated native widget code picks up the new server update settings.

:::note
On the Android emulator, use `10.0.2.2` instead of `localhost` to reach the host machine. Real devices need the host's LAN IP address.
:::

## Building the server

Voltra provides widget server handlers for the common runtime styles. Use `createAndroidWidgetUpdateHandler()` for Fetch-compatible runtimes, `createAndroidWidgetUpdateNodeHandler()` for `node:http`, and `createAndroidWidgetUpdateExpressHandler()` for Express-style handlers. All three share the same request parsing, platform validation, token validation, and response serialization.

```tsx
import { createServer } from 'node:http'
import React from 'react'
import { createAndroidWidgetUpdateNodeHandler } from '@use-voltra/android-server'
import { AndroidDynamicColors, VoltraAndroid } from '@use-voltra/android'

const handler = createAndroidWidgetUpdateNodeHandler({
  render: async (req) => {
    // req.widgetId — the widget requesting an update
    // req.platform — always "android" for Android widget requests
    // req.theme    — the system color scheme ("light" or "dark")
    // req.token    — the auth token (if credentials were set)

    const weather = await fetchWeatherData()

    const content = (
      <VoltraAndroid.Box
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: AndroidDynamicColors.surface,
          padding: 16,
        }}
      >
        <VoltraAndroid.Column style={{ width: '100%', height: '100%' }}>
          <VoltraAndroid.Text style={{ fontSize: 32, color: AndroidDynamicColors.onSurface }}>
            {weather.temp}°
          </VoltraAndroid.Text>
          <VoltraAndroid.Text style={{ fontSize: 14, color: AndroidDynamicColors.onSurfaceVariant }}>
            {weather.condition}
          </VoltraAndroid.Text>
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    )

    // Return size breakpoints for different widget sizes
    return [
      { size: { width: 200, height: 100 }, content },
      { size: { width: 200, height: 200 }, content },
      { size: { width: 300, height: 200 }, content },
    ]
  },

  validateToken: async (token) => {
    return token === 'valid-token'
  },
})

createServer(handler).listen(3333)
```

The handler responds to GET requests with these query parameters:

| Parameter | Description |
|-----------|-------------|
| `widgetId` | The widget identifier (required) |
| `platform` | The requesting platform. Must be `android` (required). |
| `family` | Not used on Android |
| `theme` | The system color scheme (`light` or `dark`) |
| `locale` | The device locale as a BCP-47 tag, e.g. `en-US` |

The `User-Agent` header is set to `VoltraWidget/<version> (Android/<version>)`.

## Returning data instead of UI

Everything above assumes your server renders Voltra components and returns a UI payload, which means it has to run Node. If you give the widget an `entry`, it renders on the device instead and your server returns plain JSON — so it can be written in any language.

Add both keys to the same widget:

```json
{
  "id": "portfolio",
  "displayName": "Portfolio",
  "description": "Your holdings",
  "targetCellWidth": 2,
  "targetCellHeight": 2,
  "entry": "./widgets/android/portfolio.tsx",
  "initialStatePath": "./widgets/android/portfolio.tsx",
  "serverUpdate": {
    "url": "https://api.example.com/widgets/portfolio",
    "intervalMinutes": 30
  }
}
```

The response body becomes the widget's props, verbatim:

```php
<?php
header('Content-Type: application/json');

echo json_encode([
  'total' => 12480.55,
  'change' => 1.8,
  'holdings' => [
    ['symbol' => 'AAPL', 'value' => 8200.00],
    ['symbol' => 'MSFT', 'value' => 4280.55],
  ],
]);
```

Your widget entry receives that object as its first argument, the same shape you would pass to `updateAndroidDynamicWidget`:

```tsx
export default function PortfolioWidget(props, env) {
  return (
    <VoltraAndroid.Column style={{ padding: 16 }}>
      <VoltraAndroid.Text style={{ fontSize: 28 }}>${props.total.toFixed(2)}</VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ fontSize: 14 }}>{props.change}% today</VoltraAndroid.Text>
    </VoltraAndroid.Column>
  )
}
```

Check the endpoint with curl before wiring up the widget:

```bash
curl "https://api.example.com/widgets/portfolio?widgetId=portfolio&platform=android&theme=dark&locale=en-US" \
  -H "Accept: application/json"
```

### What the response has to be

- Status `200` with `Content-Type: application/json` and a JSON **object**. An array, a string, a number or `null` at the top level is rejected.
- At most 256 KB.
- Return `ETag` and Voltra sends it back as `If-None-Match` on the next fetch. A `304` means the widget keeps what it has and counts as fresh. This applies to widgets with an `entry`; a payload widget's request is unconditional.
- `Cache-Control: max-age=N` moves the next fetch, clamped between 15 minutes and 24 hours. `Retry-After` on a `429` or `503` is honoured the same way.

Returning a rendered Voltra payload from an endpoint whose widget has an `entry` is rejected with a log line naming the mismatch. The widget has an entry, so it wants the data, not the picture.

### Telling fresh data from stale

The widget is never blanked by a failed fetch: it keeps rendering the last props that arrived, whether from the server or from `updateAndroidDynamicWidget`. `env.serverUpdate` says which:

```tsx
export default function PortfolioWidget(props, env) {
  const stale = env.serverUpdate?.status === 'stale'

  return (
    <VoltraAndroid.Column style={{ padding: 16, alpha: stale ? 0.6 : 1 }}>
      <VoltraAndroid.Text style={{ fontSize: 28 }}>${props.total?.toFixed(2) ?? '—'}</VoltraAndroid.Text>
      {env.serverUpdate?.fetchedAt && (
        <VoltraAndroid.Text style={{ fontSize: 12 }}>
          Updated {new Date(env.serverUpdate.fetchedAt).toLocaleTimeString()}
        </VoltraAndroid.Text>
      )}
    </VoltraAndroid.Column>
  )
}
```

| Field | Meaning |
|-------|---------|
| `status` | `fresh` after a `200` or `304`; `stale` when a fetch has succeeded before but the last one failed; `never` before the first success; `disabled` while your app has taken the widget over |
| `fetchedAt` | Epoch milliseconds of the last `200` or `304`. Absent until a fetch succeeds. |
| `error` | `network`, `http`, `unauthorized`, `parse`, or `render`. Absent when `status` is `fresh`. |
| `httpStatus` | Status code of the last response, when there was one |

`env.serverUpdate` is `undefined` on widgets without a `serverUpdate`.

Props that throw during rendering are never committed — Voltra renders them once off screen first, and keeps the previous props when that fails. `env.serverUpdate.error` is `render` while that lasts.

## Authentication

Widgets on Android are part of the main app binary, so the WorkManager background worker can access credential storage directly. Voltra credentials are encrypted at rest on-device.

:::note
`setWidgetServerCredentials` is deprecated in favour of [`setWidgetServerUpdate`](#changing-settings-at-runtime) with an `Authorization` header, which can also set the URL, the interval, the method, query parameters and a body. Both write the same encrypted records, so switching is a one-line change and nothing has to be migrated on device.
:::

### Setting credentials

Call `setWidgetServerCredentials` after the user logs in:

```typescript
import { setWidgetServerCredentials } from '@use-voltra/android-client'

await setWidgetServerCredentials({
  token: userAccessToken,
  headers: {
    'X-App-Version': '1.0.0',
  },
})
```

The `token` is required and is sent as `Authorization: Bearer <token>` on every server request. Any additional `headers` are also included. If your widget endpoint does not require authentication, skip `setWidgetServerCredentials()` entirely.

### Clearing credentials

Call `clearWidgetServerCredentials` when the user logs out:

```typescript
import { clearWidgetServerCredentials } from '@use-voltra/android-client'

await clearWidgetServerCredentials()
```

All widgets are automatically reloaded after credentials are cleared, so they revert to their default/unauthenticated state immediately.

## Changing settings at runtime

`serverUpdate` in `app.json` is the default. Once the app runs it can change any of it, per widget or for all of them, without a rebuild:

```typescript
import { setWidgetServerUpdate } from '@use-voltra/android-client'

await setWidgetServerUpdate(
  {
    url: `https://${tenant}.example.com/widgets/portfolio`,
    intervalMinutes: 30,
    headers: { Authorization: `Bearer ${accessToken}` },
  },
  { widgetId: 'portfolio' }
)
```

| Setting | |
|---------|--|
| `url` | Must be `https`, or `http` to `localhost`, `127.0.0.1` or `10.0.2.2` in a debug build |
| `intervalMinutes` | Clamped between 15 minutes and 24 hours |
| `enabled` | `false` stops fetching until you set it back |
| `method` | `GET` (default), `POST`, `PUT`, `PATCH` or `DELETE` |
| `query` | Extra query parameters |
| `headers` | Extra request headers |
| `body` | Sent as `application/json` |

Leave out `widgetId` to set the same values for every server-driven widget. A widget-scoped call wins over a global one; `headers` and `query` merge per key across the two, everything else takes the more specific value.

Each call replaces everything it set last time, so pass every field you want to keep. Setting anything reschedules the widgets it affects and fetches once straight away.

Use this instead of `setWidgetServerCredentials`, which does the same thing for the `Authorization` header alone:

```typescript
// Before
await setWidgetServerCredentials({ token: accessToken, headers: { 'X-App-Version': '1.0.0' } })

// After
await setWidgetServerUpdate({
  headers: { Authorization: `Bearer ${accessToken}`, 'X-App-Version': '1.0.0' },
})
```

To go back to what `app.json` configured, clear the settings:

```typescript
import { clearWidgetServerUpdate } from '@use-voltra/android-client'

await clearWidgetServerUpdate({ widgetId: 'portfolio' })
await clearWidgetServerUpdate()
```

Clearing the global settings is the logout gesture. Along with the settings it drops what the server last sent — the props and the "updated at" of every server-driven widget — so a Dynamic Widget goes back to rendering `{}` with `env.serverUpdate.status` of `never` rather than showing the previous account's data. A widget-scoped clear only drops that widget's overrides and leaves its props alone.

Credentials set with the deprecated `setWidgetServerCredentials` are stored separately and are not affected; clear those with `clearWidgetServerCredentials`.

Calling either function for a widget that has no `serverUpdate` in `app.json` throws. Whether a widget is server-driven is decided when the native project is generated, so a runtime URL cannot turn a local widget into one — add `serverUpdate` to `app.json` and rebuild.

A `body` set alongside `GET` or `HEAD` is dropped with a warning, because neither platform's HTTP stack can send one.

### Driving a widget from the app

`updateAndroidWidget` and `updateAndroidDynamicWidget` work on server-driven widgets, but the next scheduled fetch overwrites what you wrote. To keep it, turn fetching off first:

```typescript
await setWidgetServerUpdate({ enabled: false }, { widgetId: 'portfolio' })
await updateAndroidDynamicWidget('portfolio', localProps)
```

While fetching is off, `env.serverUpdate.status` is `disabled`, so the widget can hide its "updated N minutes ago" line. Set `enabled: true`, or clear the settings, to hand it back to the server.

## Refresh button

Server-driven widgets can display a native refresh button that lets users trigger an immediate update on demand. Enable it in your widget config:

```json
{
  "serverUpdate": {
    "url": "https://api.example.com/widgets/render",
    "intervalMinutes": 60,
    "refresh": true
  }
}
```

When enabled, a small circular button (↻) appears in the top-right corner of the widget.

On a payload widget, tapping it performs an inline HTTP fetch and pushes the update directly—without waiting for the next WorkManager cycle. On a widget with an `entry`, the tap enqueues expedited work instead, so a tap with no signal waits for connectivity and retries rather than failing silently.

## Resize handling

Your server should return all size variants in every response. When the user resizes a widget on the home screen, Voltra re-renders from cached data—no network request is made. The `RemoteViews(sizeMapping)` mechanism automatically picks the closest matching variant.

## Triggering manual refreshes

You can force-refresh server-driven widgets outside of the regular interval:

```typescript
import { reloadAndroidWidgets } from '@use-voltra/android-client'

// Reload specific widgets (triggers an immediate WorkManager fetch)
await reloadAndroidWidgets(['dynamic_weather'])

// Reload all widgets
await reloadAndroidWidgets()
```

For server-driven widgets, this enqueues an immediate one-time WorkManager request to fetch fresh content. For local-only widgets, it re-renders from cached data.

## Initial state

Server-driven widgets still need content to display before the first server fetch completes. Use `initialStatePath` to provide a pre-rendered default:

```json
{
  "id": "dynamic_weather",
  "displayName": "Dynamic Weather",
  "description": "Weather with live server updates",
  "targetCellWidth": 2,
  "targetCellHeight": 1,
  "initialStatePath": "./widgets/android/weather-initial.tsx",
  "serverUpdate": {
    "url": "https://api.example.com/widgets/render",
    "intervalMinutes": 60
  }
}
```

See [Widget pre-rendering](./widget-pre-rendering) for details on creating initial state files.

:::tip
Provide a meaningful initial state (e.g. "Loading..." or placeholder content) rather than leaving it empty. The user sees this until the first server fetch succeeds.
:::

## Cross-platform server

A single server can handle both iOS and Android requests using `createWidgetUpdateHandler` from `@use-voltra/server`:

```tsx
import { Voltra } from '@use-voltra/ios'
import { AndroidDynamicColors, VoltraAndroid } from '@use-voltra/android'
import { createWidgetUpdateHandler } from '@use-voltra/server'

const handler = createWidgetUpdateHandler({
  renderIos: async (req) => {
    // Return WidgetVariants (systemSmall, systemMedium, etc.)
    return { systemSmall: <Voltra.Text>Hello</Voltra.Text> }
  },
  renderAndroid: async (req) => {
    // Return AndroidWidgetVariants (size breakpoints)
    return [{ size: { width: 200, height: 100 }, content: <VoltraAndroid.Text>Hello</VoltraAndroid.Text> }]
  },
  validateToken: async (token) => {
    // Shared token validation for both platforms
    return verifyJwt(token)
  },
})
```

The handler uses the required `platform` query parameter to route requests to the correct render function.

If you're serving the cross-platform endpoint from Node or Express, use `createWidgetUpdateNodeHandler()` or `createWidgetUpdateExpressHandler()` from `@use-voltra/server` instead.

## Error handling and retries

WorkManager automatically handles failures with exponential backoff. After 5 consecutive failed attempts, the worker gives up to avoid infinite retry loops. The next periodic run will start fresh.

- **Network unavailable:** The request is deferred until connectivity is restored (via `NetworkType.CONNECTED` constraint).
- **Server errors (non-2xx):** The worker retries with exponential backoff, up to 3 attempts.
- **Empty response:** The worker retries with exponential backoff, up to 3 attempts.
- **Parse errors:** If the JSON is stored but parsing fails, the data is still saved so Glance can attempt to use it later. This counts as a success since the data is persisted.
- **`401` or `403`:** The worker stops rather than backing off — the status will not change until you set a new token, and doing so reloads the widget anyway.

For widgets that return props rather than UI, the widget keeps rendering the last props it has through every one of these, and `env.serverUpdate` says what went wrong.
