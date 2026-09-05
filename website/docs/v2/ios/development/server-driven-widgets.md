# Server-driven widgets

Server-driven widgets allow your Home Screen widgets to periodically fetch fresh content from a remote server—without the user opening the app. This is ideal for widgets that display dynamic data like weather, news, stock prices, or live scores.

Before you start, make sure the widget is registered in the Voltra plugin config and plan to rebuild the native app after adding or changing server-driven widget settings.

## How it works

1. You configure a `serverUpdate` URL in your widget's plugin config
2. iOS WidgetKit calls your server at the configured interval
3. Your server renders Voltra JSX components into a JSON payload
4. The widget extension parses the payload and updates the widget

The entire lifecycle is managed by the OS timeline system. Your app doesn't need to be running.

A widget that also has an `entry` works the other way round: your server returns plain JSON data and the widget renders it on the device, so the backend can be written in any language. See [Returning data instead of UI](#returning-data-instead-of-ui).

## Plugin configuration

Add the `serverUpdate` option to your widget in `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/ios-client",
        {
          "widgets": [
            {
              "id": "dynamic_weather",
              "displayName": "Dynamic Weather",
              "description": "Weather with live server updates",
              "supportedFamilies": ["systemSmall", "systemMedium", "systemLarge"],
              "serverUpdate": {
                "url": "https://api.example.com/widgets/render",
                "intervalMinutes": 30
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

- `url`: The endpoint the widget fetches from. Voltra appends `widgetId`, `platform`, `family`, `theme`, and `locale` query parameters automatically (e.g. `?widgetId=dynamic_weather&platform=ios&family=systemSmall&theme=dark&locale=en-US`). Optional — leave it out to mark the widget server-driven and supply the URL after login with [`setWidgetServerUpdate`](#changing-settings-at-runtime).
- `intervalMinutes`: How often the widget fetches updates. Defaults to `15`. WidgetKit may stretch it: the reload budget is shared across every widget in your app, and frequently viewed widgets get roughly 40 to 70 reloads a day between them.
- `refresh`: Whether to show a native refresh button in the top-right corner of the widget. When tapped, triggers an immediate server fetch. Defaults to `false`. Requires iOS 17+.

After updating plugin configuration, run `npx expo prebuild` if you're using Continuous Native Generation, then rebuild the app so the generated native files and widget extension pick up the new server update settings.

## Building the server

Voltra provides widget server handlers for the common runtime styles. Use `createWidgetUpdateHandler()` for Fetch-compatible runtimes, `createWidgetUpdateNodeHandler()` for `node:http`, and `createWidgetUpdateExpressHandler()` for Express-style handlers. All three share the same request parsing, platform validation, token validation, and response serialization.

```tsx
import { createServer } from 'node:http'
import React from 'react'
import { createIOSWidgetUpdateNodeHandler, Voltra } from '@use-voltra/ios-server'

const handler = createIOSWidgetUpdateNodeHandler({
  render: async (req) => {
    // req.widgetId — the widget requesting an update
    // req.platform — always "ios" for iOS widget requests
    // req.family   — the widget size ("systemSmall", "systemMedium", etc.)
    // req.theme    — the system color scheme ("light" or "dark")
    // req.token    — the auth token (if credentials were set)

    const weather = await fetchWeatherData()

    return {
      systemSmall: (
        <Voltra.VStack style={{ flex: 1, padding: 16, backgroundColor: '#101828' }}>
          <Voltra.Text style={{ color: '#FFF', fontSize: 32 }}>{weather.temp}°</Voltra.Text>
          <Voltra.Text style={{ color: '#94A3B8' }}>{weather.condition}</Voltra.Text>
        </Voltra.VStack>
      ),
      systemMedium: (
        <Voltra.HStack style={{ flex: 1, padding: 16, backgroundColor: '#101828' }}>
          <Voltra.Text style={{ color: '#FFF', fontSize: 32 }}>{weather.temp}°</Voltra.Text>
          <Voltra.VStack style={{ marginLeft: 12 }}>
            <Voltra.Text style={{ color: '#FFF' }}>{weather.condition}</Voltra.Text>
            <Voltra.Text style={{ color: '#94A3B8', fontSize: 12 }}>
              H: {weather.high}° L: {weather.low}°
            </Voltra.Text>
          </Voltra.VStack>
        </Voltra.HStack>
      ),
    }
  },

  validateToken: async (token) => {
    // Return true if the token is valid, false to reject with 401
    return token === 'valid-token'
  },
})

createServer(handler).listen(3333, () => {
  console.log('Widget server running on http://localhost:3333')
})
```

The handler responds to GET requests with these query parameters:

| Parameter | Description |
|-----------|-------------|
| `widgetId` | The widget identifier (required) |
| `platform` | The requesting platform. Must be `ios` for iOS widgets (required). |
| `family` | The widget family/size (iOS only) |
| `theme` | The system color scheme (`light` or `dark`) |
| `locale` | The device locale as a BCP-47 tag, e.g. `en-US` |

The `Authorization: Bearer <token>` header is automatically extracted and passed to `validateToken` and `render`. The `User-Agent` header is set to `VoltraWidget/1.0 (iOS/<version>)`.

For Fetch-native runtimes, use `createWidgetUpdateHandler()` instead of the Node adapter:

```tsx
import { createIOSWidgetUpdateHandler, Voltra } from '@use-voltra/ios-server'

export const GET = createIOSWidgetUpdateHandler({
  render: async (req) => ({
    systemSmall: <Voltra.Text>{req.widgetId}</Voltra.Text>,
  }),
})
```

## Returning data instead of UI

Everything above assumes your server renders Voltra components and returns a UI payload, which means it has to run Node. If you give the widget an `entry`, it renders on the device instead and your server returns plain JSON — so it can be written in any language.

Add both keys to the same widget. A widget with an `entry` and a `serverUpdate` also needs a `groupIdentifier`, because the fetched props are shared with the widget extension through the App Group:

```json
{
  "id": "portfolio",
  "displayName": "Portfolio",
  "description": "Your holdings",
  "supportedFamilies": ["systemSmall", "systemMedium"],
  "entry": "./widgets/ios/portfolio.tsx",
  "initialStatePath": "./widgets/ios/portfolio.tsx",
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

Your widget entry receives that object as its first argument, the same shape you would pass to `updateDynamicWidget`:

```tsx
export default function PortfolioWidget(props, env) {
  return (
    <Voltra.VStack style={{ flex: 1, padding: 16 }}>
      <Voltra.Text style={{ fontSize: 28 }}>${props.total.toFixed(2)}</Voltra.Text>
      <Voltra.Text style={{ fontSize: 14 }}>{props.change}% today</Voltra.Text>
    </Voltra.VStack>
  )
}
```

Check the endpoint with curl before wiring up the widget:

```bash
curl "https://api.example.com/widgets/portfolio?widgetId=portfolio&platform=ios&theme=dark&locale=en-US" \
  -H "Accept: application/json"
```

One fetch serves every size and instance of the widget, so the request carries no `family` and your props have to be size-agnostic. The entry picks its layout from `env.widgetFamily`, the way it already does.

### What the response has to be

- Status `200` with `Content-Type: application/json` and a JSON **object**. An array, a string, a number or `null` at the top level is rejected.
- At most 256 KB. The widget extension has a 30 MB memory ceiling for the whole render.
- Return `ETag` and Voltra sends it back as `If-None-Match` on the next fetch. A `304` means the widget keeps what it has and counts as fresh. This applies to widgets with an `entry`; a payload widget's request is unconditional.
- `Cache-Control: max-age=N` moves the next fetch, clamped between 15 minutes and 24 hours. `Retry-After` on a `429` or `503` is honoured the same way.

Returning a rendered Voltra payload from an endpoint whose widget has an `entry` is rejected with a log line naming the mismatch. The widget has an entry, so it wants the data, not the picture.

### Telling fresh data from stale

The widget is never blanked by a failed fetch: it keeps rendering the last props that arrived, whether from the server or from `updateDynamicWidget`. `env.serverUpdate` says which:

```tsx
export default function PortfolioWidget(props, env) {
  const stale = env.serverUpdate?.status === 'stale'

  return (
    <Voltra.VStack style={{ flex: 1, padding: 16, opacity: stale ? 0.6 : 1 }}>
      <Voltra.Text style={{ fontSize: 28 }}>${props.total?.toFixed(2) ?? '—'}</Voltra.Text>
      {env.serverUpdate?.fetchedAt && (
        <Voltra.Text style={{ fontSize: 12 }}>
          Updated {new Date(env.serverUpdate.fetchedAt).toLocaleTimeString()}
        </Voltra.Text>
      )}
    </Voltra.VStack>
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

Widgets run in a separate extension process and can't access your app's network layer or auth state. Voltra solves this by storing credentials in the **Shared Keychain**, which is accessible by both the main app and the widget extension.

:::note
`setWidgetServerCredentials` is deprecated in favour of [`setWidgetServerUpdate`](#changing-settings-at-runtime) with an `Authorization` header, which can also set the URL, the interval, the method, query parameters and a body. Both write the same Keychain records, so switching is a one-line change and nothing has to be migrated on device.
:::

### Setting credentials

Call `setWidgetServerCredentials` after the user logs in:

```typescript
import { setWidgetServerCredentials } from '@use-voltra/ios-client'

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
import { clearWidgetServerCredentials } from '@use-voltra/ios-client'

await clearWidgetServerCredentials()
```

All widget timelines are automatically reloaded after credentials are cleared, so widgets revert to their default/unauthenticated state immediately.

### Keychain group

For credentials to be shared between the main app and the widget extension, both must belong to the same Keychain Access Group. This is configured via the `keychainGroup` plugin option:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/ios-client",
        {
          "keychainGroup": "$(AppIdentifierPrefix)com.example.shared",
          "widgets": [...]
        }
      ]
    ]
  }
}
```

If you don't specify `keychainGroup` but any widget has `serverUpdate` configured, Voltra automatically derives a default: `$(AppIdentifierPrefix)<bundleIdentifier>`.

## Changing settings at runtime

`serverUpdate` in `app.json` is the default. Once the app runs it can change any of it, per widget or for all of them, without a rebuild:

```typescript
import { setWidgetServerUpdate } from '@use-voltra/ios-client'

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
| `url` | Must be `https`, or `http` to `localhost` or `127.0.0.1` in a debug build |
| `intervalMinutes` | Clamped between 15 minutes and 24 hours |
| `enabled` | `false` stops fetching until you set it back |
| `method` | `GET` (default), `POST`, `PUT`, `PATCH` or `DELETE` |
| `query` | Extra query parameters |
| `headers` | Extra request headers |
| `body` | Sent as `application/json` |

Leave out `widgetId` to set the same values for every server-driven widget. A widget-scoped call wins over a global one; `headers` and `query` merge per key across the two, everything else takes the more specific value.

Each call replaces everything it set last time, so pass every field you want to keep. Setting anything reloads the widgets it affects, so the change takes effect without waiting out the current interval.

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
import { clearWidgetServerUpdate } from '@use-voltra/ios-client'

await clearWidgetServerUpdate({ widgetId: 'portfolio' })
await clearWidgetServerUpdate()
```

Clearing the global settings is the logout gesture. Along with the settings it drops what the server last sent — the props and the "updated at" of every server-driven widget — so a Dynamic Widget goes back to rendering `{}` with `env.serverUpdate.status` of `never` rather than showing the previous account's data. A widget-scoped clear only drops that widget's overrides and leaves its props alone.

Credentials set with the deprecated `setWidgetServerCredentials` are stored separately and are not affected; clear those with `clearWidgetServerCredentials`.

Calling either function for a widget that has no `serverUpdate` in `app.json` throws. Whether a widget is server-driven is decided when the native project is generated, so a runtime URL cannot turn a local widget into one — add `serverUpdate` to `app.json` and rebuild.

A `body` set alongside `GET` or `HEAD` is dropped with a warning, because `URLSession` cannot send one.

### Driving a widget from the app

`updateWidget` and `updateDynamicWidget` work on server-driven widgets, but the next scheduled fetch overwrites what you wrote. To keep it, turn fetching off first:

```typescript
await setWidgetServerUpdate({ enabled: false }, { widgetId: 'portfolio' })
await updateDynamicWidget('portfolio', localProps)
```

While fetching is off, `env.serverUpdate.status` is `disabled`, so the widget can hide its "updated N minutes ago" line. Set `enabled: true`, or clear the settings, to hand it back to the server.

## Refresh button

Server-driven widgets can display a native refresh button that lets users trigger an immediate update on demand. Enable it in your widget config:

```json
{
  "serverUpdate": {
    "url": "https://api.example.com/widgets/render",
    "intervalMinutes": 30,
    "refresh": true
  }
}
```

When enabled, a small circular button (↻) appears in the top-right corner of the widget. Tapping it triggers `reloadTimelines(ofKind:)` via an `AppIntent`, which causes WidgetKit to immediately fetch fresh content from your server.

:::note
The refresh button requires iOS 17+ (`AppIntent` API). On older iOS versions, the button is not shown.
:::

### Fetch coalescing

When WidgetKit reloads timelines, it may call `getTimeline` multiple times for each supported family (e.g. `systemSmall`, `systemMedium`). To avoid redundant network requests, Voltra coalesces fetches within a 3-second window per widget. Only the first call triggers a server fetch; subsequent calls within the window use cached data and `selectContentForFamily` picks the correct family-specific content.

## Triggering manual refreshes

You can force-refresh server-driven widgets outside of the regular interval:

```typescript
import { reloadWidgets } from '@use-voltra/ios-client'

// Reload specific widgets
await reloadWidgets(['dynamic_weather'])

// Reload all widgets
await reloadWidgets()
```

This triggers an immediate timeline refresh, which causes WidgetKit to call your server for new content.

## Initial state

Server-driven widgets still need content to display before the first server fetch completes (e.g. when the widget is first added to the Home Screen). Use `initialStatePath` to provide a pre-rendered default:

```json
{
  "id": "dynamic_weather",
  "displayName": "Dynamic Weather",
  "description": "Weather with live server updates",
  "supportedFamilies": ["systemSmall", "systemMedium"],
  "initialStatePath": "./widgets/ios/weather-initial.tsx",
  "serverUpdate": {
    "url": "https://api.example.com/widgets/render",
    "intervalMinutes": 30
  }
}
```

See [Widget pre-rendering](./widget-pre-rendering) for details on creating initial state files.

:::tip
Provide a meaningful initial state (e.g. "Loading..." or placeholder content) rather than leaving it empty. The user sees this until the first server fetch succeeds.
:::

## Error handling and retries

When a server fetch fails, the widget extension falls back to the last successfully fetched data (or the initial state if no data has been fetched yet), and WidgetKit schedules a retry after 15 minutes. The last successful response is kept in memory for the lifetime of the widget extension process; when an App Group is configured it is also persisted so a freshly started process can fall back to it. This applies to network errors/timeouts, non-2xx server errors, and empty responses.

Parse errors are handled slightly differently: if the server returns a 2xx response but the JSON can't be parsed into a valid widget tree, the cached data from the previous successful fetch is preserved (not overwritten), so the widget keeps showing the last known good content.

A `401` or `403` does not shorten the retry: the status will not change until you set a new token, and doing so reloads the widget anyway.

For widgets that return props rather than UI, the widget keeps rendering the last props it has through every one of these, and `env.serverUpdate` says what went wrong.

:::note
WidgetKit may also throttle updates based on battery level and widget visibility.
:::
