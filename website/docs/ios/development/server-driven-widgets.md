# Server-driven widgets

Server-driven widgets allow your Home Screen widgets to periodically fetch fresh content from a remote server—without the user opening the app. This is ideal for widgets that display dynamic data like weather, news, stock prices, or live scores.

Before you start, make sure the widget is registered in the Voltra plugin config and plan to rebuild the native app after adding or changing server-driven widget settings.

## How it works

1. You configure a `serverUpdate` URL in your widget's plugin config
2. iOS WidgetKit calls your server at the configured interval
3. Your server renders Voltra JSX components into a JSON payload
4. The widget extension parses the payload and updates the widget

The entire lifecycle is managed by the OS timeline system. Your app doesn't need to be running.

## Plugin configuration

Add the `serverUpdate` option to your widget in `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
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

- `url`: The Voltra SSR endpoint that returns widget JSON. Voltra appends `widgetId`, `platform`, `family`, and `theme` query parameters automatically (e.g. `?widgetId=dynamic_weather&platform=ios&family=systemSmall&theme=dark`).
- `intervalMinutes`: How often the widget fetches updates. Defaults to `15`. iOS WidgetKit may throttle requests; the minimum effective interval is ~15 minutes.

After updating plugin configuration, run `npx expo prebuild` if you're using Continuous Native Generation, then rebuild the app so the generated native files and widget extension pick up the new server update settings.

## Building the server

Voltra provides widget server handlers for the common runtime styles. Use `createWidgetUpdateHandler()` for Fetch-compatible runtimes, `createWidgetUpdateNodeHandler()` for `node:http`, and `createWidgetUpdateExpressHandler()` for Express-style handlers. All three share the same request parsing, platform validation, token validation, and response serialization.

```tsx
import { createServer } from 'node:http'
import React from 'react'
import { createWidgetUpdateNodeHandler, Voltra } from 'voltra/server'

const handler = createWidgetUpdateNodeHandler({
  renderIos: async (req) => {
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

The `Authorization: Bearer <token>` header is automatically extracted and passed to `validateToken` and `renderIos`. The `User-Agent` header is set to `VoltraWidget/1.0 (iOS/<version>)`.

For Fetch-native runtimes, use `createWidgetUpdateHandler()` instead of the Node adapter:

```tsx
import { createWidgetUpdateHandler, Voltra } from 'voltra/server'

export const GET = createWidgetUpdateHandler({
  renderIos: async (req) => ({
    systemSmall: <Voltra.Text>{req.widgetId}</Voltra.Text>,
  }),
})
```

## Authentication

Widgets run in a separate extension process and can't access your app's network layer or auth state. Voltra solves this by storing credentials in the **Shared Keychain**, which is accessible by both the main app and the widget extension.

### Setting credentials

Call `setWidgetServerCredentials` after the user logs in:

```typescript
import { setWidgetServerCredentials } from 'voltra/client'

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
import { clearWidgetServerCredentials } from 'voltra/client'

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
        "voltra",
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

## Triggering manual refreshes

You can force-refresh server-driven widgets outside of the regular interval:

```typescript
import { reloadWidgets } from 'voltra/client'

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

## Architecture overview

```
┌─────────────────┐     setWidgetServerCredentials()     ┌──────────────────┐
│   React Native   │ ──────────────────────────────────►  │  Shared Keychain  │
│   (main app)     │                                      └──────────────────┘
└─────────────────┘                                              │
                                                                 │ reads token
                                                                 ▼
┌─────────────────┐ GET ?widgetId=X&platform=ios&family=Y&theme=Z ┌──────────────────┐
│  WidgetKit       │ ──────────────────────────────────►  │  Your Server     │
│  (extension)     │ ◄──────────────────────────────────  │  (Voltra SSR)    │
└─────────────────┘          JSON payload                 └──────────────────┘
        │
        ▼
   Home Screen Widget
```

WidgetKit manages the scheduling and calls your server at the configured interval. The widget extension reads credentials from the Shared Keychain, makes the HTTP request, and renders the response payload.

## Error handling and retries

When a server fetch fails, the widget extension falls back to the last successfully fetched data (or the initial state if no data has been fetched yet). WidgetKit schedules a retry after 15 minutes.

- **Network error / timeout:** The widget falls back to cached content and retries in 15 minutes.
- **Server errors (non-2xx):** Same fallback behavior — cached content is shown and a retry is scheduled in 15 minutes.
- **Empty response:** Treated as an error; cached content is displayed.
- **Parse errors:** If the server returns a 2xx response but the JSON can't be parsed into a valid widget tree, the cached data from the previous successful fetch is preserved (not overwritten). The widget continues to show the last known good content.

:::note
Unlike Android's WorkManager which retries with exponential backoff, iOS WidgetKit uses its own timeline-based scheduling. After a failed fetch, the timeline provider falls back to local data and schedules a retry in 15 minutes. WidgetKit may also throttle updates based on battery level and widget visibility.
:::
