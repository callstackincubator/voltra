# Plugin configuration

The Voltra Expo config plugin accepts several configuration options in your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/ios-client",
        {
          "groupIdentifier": "group.your.bundle.identifier",
          "enablePushNotifications": true,
          "deploymentTarget": "18.0",
          "targetName": "MyAppLiveActivity",
          "widgets": [
            {
              "id": "weather",
              "displayName": "Weather Widget",
              "description": "Shows current weather conditions",
              "supportedFamilies": ["systemSmall", "systemMedium", "systemLarge"],
              "initialStatePath": "./widgets/weather-initial.tsx"
            }
          ]
        }
      ]
    ]
  }
}
```

## Configuration options

### `groupIdentifier` (optional)

App Group identifier for sharing data between your app and the widget extension. Required if you want to:

- Forward component events (like button taps) from Live Activities to your JavaScript code
- Share images between your app and the extension
- Use image preloading features

**Format:** Must start with `group.` (e.g., `group.your.bundle.identifier`)

### `enablePushNotifications` (optional)

Enable server-side updates for Live Activities via Apple Push Notification Service (APNS). When enabled, you can update Live Activities even when your app is in the background or terminated.

**Type:** `boolean`  
**Default:** `false`

### `deploymentTarget` (optional)

iOS deployment target version for the widget extension. If not provided, defaults to `17.0`. This allows the widget extension to have its own deployment target independent of the main app.

**Type:** `string`
**Default:** `"17.0"`
**Example:** `"18.0"`

**Note:** Code signing settings (development team, provisioning profiles) are automatically synchronized from the main app target, but the deployment target can be set independently.

### `targetName` (optional)

Custom target name for the widget extension. If not provided, defaults to `{AppName}LiveActivity` where `AppName` is your app's sanitized name.

This is useful when:
- Migrating from other Live Activity solutions (e.g., `@bacons/apple-targets`)
- Matching existing provisioning profiles or credentials
- Using a specific naming convention for your organization

**Type:** `string`
**Default:** `"{AppName}LiveActivity"`
**Example:** `"widget"`, `"MyAppLiveActivity"`

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/ios-client",
        {
          "groupIdentifier": "group.your.bundle.identifier",
          "targetName": "widget"
        }
      ]
    ]
  }
}
```

### `widgets` (optional)

Array of widget configurations for Home Screen widgets. Each widget will be available in the iOS widget gallery.

**Widget Configuration Properties:**

- `id`: Unique identifier for the widget (alphanumeric with underscores only)
- `displayName`: Name shown in the widget gallery (plain string, or per-locale map like `{ "en": "Weather", "pl": "Pogoda" }`; locale keys are BCP‑47-style tags)
- `description`: Description shown in the widget gallery (same localization rules as `displayName`)
- `supportedFamilies`: Array of supported widget sizes (`systemSmall`, `systemMedium`, `systemLarge`)
- `initialStatePath`: (optional) Project-relative path to a file that exports initial widget state, **or** a locale map of paths for localized build-time pre-rendering (see [Widget Pre-rendering](../development/widget-pre-rendering))
- `serverUpdate`: (optional) Enable server-driven updates. See [Server-driven widgets](../development/server-driven-widgets) for full details.
  - `url`: The Voltra SSR endpoint URL
  - `intervalMinutes`: Update interval in minutes (default: `15`)
  - `refresh`: Show a native refresh button (default: `false`, requires iOS 17+)

**Example:**

```json
{
  "widgets": [
    {
      "id": "weather",
      "displayName": "Weather Widget",
      "description": "Current weather conditions",
      "supportedFamilies": ["systemSmall", "systemMedium", "systemLarge"],
      "initialStatePath": {
        "en": "./widgets/weather-initial.tsx",
        "pl": "./widgets/weather-initial-pl.tsx"
      },
      "serverUpdate": {
        "url": "https://api.example.com/widgets/render",
        "intervalMinutes": 30,
        "refresh": true
      }
    }
  ]
}
```

### Localizing `displayName` and `description`

Use a locale map when the widget gallery label should be translated:

```json
{
  "widgets": [
    {
      "id": "weather",
      "displayName": {
        "en": "Weather",
        "pl": "Pogoda",
        "zh-Hans": "天气"
      },
      "description": {
        "en": "Current weather conditions",
        "pl": "Aktualne warunki pogodowe",
        "zh-Hans": "当前天气状况"
      }
    }
  ]
}
```

Use BCP-47-style locale tags such as `en`, `en-US`, `pt-BR`, or `zh-Hans`.

Fallback behavior:

- Voltra first tries the device locale.
- If there is no exact match, it falls back to the language-only match.
- If there is still no match, it prefers an English locale such as `en` or `en-US`.
- If no English entry exists, it uses the first configured locale.
