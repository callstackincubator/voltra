# Server-driven widgets

Server-driven widgets allow your Android Home Screen widgets to periodically fetch fresh content from a remote server—without the user opening the app. This is powered by WorkManager, which handles scheduling, retries, and network constraints automatically.

Before you start, make sure the widget is registered in the Voltra plugin config and plan to rebuild the native app after adding or changing server-driven widget settings.

## How it works

1. You configure a `serverUpdate` URL in your Android widget's plugin config
2. WorkManager runs a periodic background task at the configured interval
3. Your server renders Voltra JSX components into a JSON payload
4. The worker parses the payload and pushes a `RemoteViews` update to the widget

Your app doesn't need to be running. WorkManager handles everything in the background.

## Plugin configuration

Add the `serverUpdate` option to your Android widget in `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "android": {
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
        }
      ]
    ]
  }
}
```

**`serverUpdate` options:**

- `url`: The Voltra SSR endpoint that returns widget JSON. Voltra appends `widgetId` and `platform=android` query parameters automatically (e.g. `?widgetId=dynamic_weather&platform=android`).
- `intervalMinutes`: How often the widget fetches updates. Defaults to `15`. The minimum effective interval is 15 minutes (WorkManager requirement).

After updating plugin configuration, run `npx expo prebuild` if you're using Continuous Native Generation, then rebuild the app so the generated native widget code picks up the new server update settings.

:::note
On the Android emulator, use `10.0.2.2` instead of `localhost` to reach the host machine. Real devices need the host's LAN IP address.
:::

## Building the server

Voltra provides widget server handlers for the common runtime styles. Use `createWidgetUpdateHandler()` for Fetch-compatible runtimes, `createWidgetUpdateNodeHandler()` for `node:http`, and `createWidgetUpdateExpressHandler()` for Express-style handlers. All three share the same request parsing, platform validation, token validation, and response serialization.

```tsx
import { createServer } from 'node:http'
import React from 'react'
import { createWidgetUpdateNodeHandler } from 'voltra/server'
import { VoltraAndroid } from 'voltra/android'

const handler = createWidgetUpdateNodeHandler({
  renderAndroid: async (req) => {
    // req.widgetId — the widget requesting an update
    // req.platform — always "android" for Android widget requests
    // req.token    — the auth token (if credentials were set)

    const weather = await fetchWeatherData()

    const content = (
      <VoltraAndroid.Box
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#101828',
          padding: 16,
        }}
      >
        <VoltraAndroid.Column style={{ width: '100%', height: '100%' }}>
          <VoltraAndroid.Text style={{ fontSize: 32, color: '#FFF' }}>
            {weather.temp}°
          </VoltraAndroid.Text>
          <VoltraAndroid.Text style={{ fontSize: 14, color: '#94A3B8' }}>
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

  // Also handle iOS requests from the same endpoint
  renderIos: async (req) => {
    // ...
    return null // or return iOS variants
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
| `platform` | The requesting platform. Must be `android` or `ios` (required). |
| `family` | The widget family/size (iOS only — absent for Android) |

## Authentication

Widgets on Android are part of the main app binary, so the WorkManager background worker can access credential storage directly. Voltra encrypts credentials at rest using **Google Tink** (AES-256-GCM with Android Keystore-backed key management) and persists them in Jetpack DataStore.

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

All widgets are automatically reloaded after credentials are cleared, so they revert to their default/unauthenticated state immediately.

## Triggering manual refreshes

You can force-refresh server-driven widgets outside of the regular interval:

```typescript
import { reloadWidgets } from 'voltra/client'

// Reload specific widgets (triggers an immediate WorkManager fetch)
await reloadWidgets(['dynamic_weather'])

// Reload all widgets
await reloadWidgets()
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

A single server can handle both iOS and Android requests using `createWidgetUpdateHandler`:

```tsx
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

If you're serving the endpoint from Node or Express, use `createWidgetUpdateNodeHandler()` or `createWidgetUpdateExpressHandler()` instead.

## Architecture overview

```
┌─────────────────┐   setWidgetServerCredentials()   ┌─────────────────────────┐
│   React Native   │ ─────────────────────────────►   │  EncryptedSharedPrefs    │
│   (main app)     │                                  └─────────────────────────┘
└─────────────────┘                                            │
                                                               │ reads token
                                                               ▼
┌─────────────────┐ GET ?widgetId=X&platform=android ┌──────────────────┐
│  WorkManager     │ ─────────────────────────────►   │  Your Server     │
│  (background)    │ ◄─────────────────────────────   │  (Voltra SSR)    │
└─────────────────┘       JSON payload               └──────────────────┘
        │
        ▼
   AppWidgetManager
   (RemoteViews update)
        │
        ▼
   Home Screen Widget
```

WorkManager handles scheduling, network constraints, and retries. The background worker reads credentials from encrypted storage, makes the HTTP request, parses the response, generates `RemoteViews`, and pushes the update via `AppWidgetManager`.

## Error handling and retries

WorkManager automatically handles failures with exponential backoff. After 5 consecutive failed attempts, the worker gives up to avoid infinite retry loops. The next periodic run will start fresh.

- **Network unavailable:** The request is deferred until connectivity is restored (via `NetworkType.CONNECTED` constraint).
- **Server errors (non-2xx):** The worker retries with exponential backoff, up to 3 attempts.
- **Empty response:** The worker retries with exponential backoff, up to 3 attempts.
- **Parse errors:** If the JSON is stored but parsing fails, the data is still saved so Glance can attempt to use it later. This counts as a success since the data is persisted.
