# Plugin Configuration (Android)

The Voltra Expo config plugin accepts Android-specific configuration options in your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/android-client",
        {
          "enableNotifications": true,
          "widgets": [
            {
              "id": "weather",
              "displayName": "Weather Widget",
              "description": "Shows current weather conditions",
              "targetCellWidth": 2,
              "targetCellHeight": 2,
              "initialStatePath": "./widgets/weather-initial.tsx",
              "previewImage": "./assets/widgets/weather-preview.png"
            }
          ]
        }
      ]
    ]
  }
}
```

## Android-Specific Configuration

### `enableNotifications` (optional)

Enables Android notification-related manifest plumbing used by Voltra features such as ongoing notifications.

When enabled, the config plugin adds:

- `android.permission.POST_NOTIFICATIONS`
- `android.permission.POST_PROMOTED_NOTIFICATIONS`
- `voltra.VoltraOngoingNotificationDismissedReceiver`

This does not grant runtime notification permission automatically. Your app still needs to request notification permission on Android 13 and above.

For setup and usage examples, see [Managing Android Ongoing Notifications](../development/managing-ongoing-notifications).

### `widgets` (optional)

Array of widget configurations for Home Screen widgets. Each widget will be available in the Android widget picker.

**Widget Configuration Properties:**

- `id`: Unique identifier for the widget (alphanumeric with underscores only)
- `displayName`: Name shown in the widget picker (plain string, or per-locale map; same rules as iOS `widgets[].displayName`)
- `description`: Description shown in the widget picker (same rules as `displayName`)
- `targetCellWidth`: Target widget width in grid cells (1-5, required)
- `targetCellHeight`: Target widget height in grid cells (1-5, required)
- `minWidth`: (optional) Minimum width in dp, used on Android 11 and older (defaults to a value derived from `minCellWidth` or `targetCellWidth`)
- `minHeight`: (optional) Minimum height in dp, used on Android 11 and older (defaults to a value derived from `minCellHeight` or `targetCellHeight`)
- `minCellWidth`: **Deprecated.** (optional) Minimum width in grid cells, converted to dp; prefer `minWidth`
- `minCellHeight`: **Deprecated.** (optional) Minimum height in grid cells, converted to dp; prefer `minHeight`
- `minResizeWidth`: (optional) Smallest width the user can resize the widget to, in dp (supported on all Android versions)
- `minResizeHeight`: (optional) Smallest height the user can resize the widget to, in dp (supported on all Android versions)
- `maxResizeWidth`: (optional) Largest width the user can resize the widget to, in dp (Android 12+; ignored on older versions)
- `maxResizeHeight`: (optional) Largest height the user can resize the widget to, in dp (Android 12+; ignored on older versions)
- `resizeMode`: (optional) Widget resize behavior (`"none"` | `"horizontal"` | `"vertical"` | `"horizontal|vertical"`, default: `"horizontal|vertical"`)
- `widgetCategory`: (optional) Widget category (`"home_screen"` | `"keyguard"` | `"home_screen|keyguard"`, default: `"home_screen"`)
- `initialStatePath`: (optional) Path to a file that exports initial widget state, or a locale map of paths for localized build-time pre-rendering (see [Widget Pre-rendering](../development/widget-pre-rendering))
- `previewImage`: (optional) Path to preview image for widget picker (PNG/JPG/WebP)
- `previewLayout`: (optional) Path to custom XML layout for widget picker preview (Android 12+)
- `serverUpdate`: (optional) Fetch the widget's content on a schedule. Without `entry` the server returns a rendered payload; with `entry` it returns plain JSON that the widget renders on the device. `url` is optional — leave it out to supply one at runtime. See [Server-driven widgets](../development/server-driven-widgets) for full details.
  - `url`: The Voltra SSR endpoint URL
  - `intervalMinutes`: Update interval in minutes (default: `15`, minimum 15 per WorkManager)
  - `refresh`: Show a native refresh button (default: `false`)

### Localizing `displayName` and `description`

Use a locale map when the widget picker label should be translated:

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
      },
      "targetCellWidth": 2,
      "targetCellHeight": 2
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

For widget sizing math and widget-picker preview setup (`previewImage`, `previewLayout`), see [Widget Sizing & Previews](./widget-sizing-and-previews).

## Widget Pre-rendering

Use `initialStatePath` to bundle pre-rendered widget state for the first time a widget is added to the home screen. See [Widget Pre-rendering](../development/widget-pre-rendering) for details.

## Example Configuration

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/android-client",
        {
          "enableNotifications": true,
          "widgets": [
            {
              "id": "voltra",
                "displayName": "Voltra Widget",
                "description": "Voltra logo widget",
                "minCellWidth": 2,
                "minCellHeight": 2,
                "targetCellWidth": 2,
                "targetCellHeight": 2,
                "resizeMode": "horizontal|vertical",
                "widgetCategory": "home_screen",
                "initialStatePath": "./widgets/android-voltra-widget-initial.tsx",
                "previewImage": "./assets/voltra-icon.jpg"
              },
              {
                "id": "interactive_todos",
                "displayName": "Interactive Todos",
                "description": "Quick todo list widget",
                "targetCellWidth": 2,
                "targetCellHeight": 2,
                "previewLayout": "./assets/widgets/todos-preview.xml"
            }
          ]
        }
      ]
    ]
  }
}
```
