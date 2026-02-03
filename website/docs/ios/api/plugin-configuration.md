# Plugin configuration

The Voltra Expo config plugin accepts several configuration options in your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
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
        "voltra",
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
- `displayName`: Name shown in the widget gallery
- `description`: Description shown in the widget gallery
- `supportedFamilies`: Array of supported widget sizes (`systemSmall`, `systemMedium`, `systemLarge`)
- `initialStatePath`: (optional) Path to a file that exports initial widget state (see [Widget Pre-rendering](../development/widget-pre-rendering))

**Example:**

```json
{
  "widgets": [
    {
      "id": "weather",
      "displayName": "Weather Widget",
      "description": "Current weather conditions",
      "supportedFamilies": ["systemSmall", "systemMedium", "systemLarge"],
      "initialStatePath": "./widgets/weather-initial.tsx"
    }
  ]
}
```
