---
title: "Plugin Configuration (Android)"
description: "Reference for the Android Voltra Expo plugin options, including enableNotifications and widgets, plus widget pre-rendering."
---

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

For setup and usage examples, see [Managing Android Ongoing Notifications](/android/development/managing-ongoing-notifications).

### `ongoingNotificationForegroundService` (optional)

Declares Voltra's foreground service, which keeps the app process alive while an ongoing notification is showing. Requires `enableNotifications: true`.

```json
{
  "enableNotifications": true,
  "ongoingNotificationForegroundService": {
    "types": ["location", "dataSync"]
  }
}
```

The config plugin adds:

- `android.permission.FOREGROUND_SERVICE`
- one `FOREGROUND_SERVICE_*` permission per type, from the table below
- a `voltra.ongoingnotification.VoltraOngoingNotificationService` `<service>` with `android:exported="false"` and `android:foregroundServiceType` set to the configured types, for example `location|dataSync`

Properties:

- `types`: non-empty array of foreground service types the service runs with
- `specialUseSubtype`: required when `types` includes `specialUse`. Written to the service as the `android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE` property. Describe the use case in a sentence; Google Play reviewers read it

| Type | Permission added | Runtime permission your app must request | Notes |
| --- | --- | --- | --- |
| `location` | `FOREGROUND_SERVICE_LOCATION` | `ACCESS_COARSE_LOCATION` or `ACCESS_FINE_LOCATION` | |
| `health` | `FOREGROUND_SERVICE_HEALTH` | A body sensor permission such as `BODY_SENSORS`, or `ACTIVITY_RECOGNITION` | Android 14+ |
| `mediaPlayback` | `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | None | |
| `remoteMessaging` | `FOREGROUND_SERVICE_REMOTE_MESSAGING` | None | Android 14+ |
| `connectedDevice` | `FOREGROUND_SERVICE_CONNECTED_DEVICE` | A device permission such as `BLUETOOTH_CONNECT`, `CHANGE_WIFI_STATE` or `NFC` | |
| `dataSync` | `FOREGROUND_SERVICE_DATA_SYNC` | None | Android 15+ limits it to 6 hours a day |
| `shortService` | None, only `FOREGROUND_SERVICE` | None | Android 14+. Android stops it after about 3 minutes |
| `specialUse` | `FOREGROUND_SERVICE_SPECIAL_USE` | None | Android 14+. Needs `specialUseSubtype` |

The per-type permissions are enforced from Android 14 (API 34). Types marked Android 14+ were added in that release.

Voltra never adds the runtime permissions in the third column. Declare them in your manifest and request them in the app before the service starts, or Android refuses to start it.

Other types, such as `camera`, `microphone`, `mediaProjection`, `phoneCall`, `mediaProcessing` and `systemExempted`, are rejected.

Google Play asks you to declare every foreground service type your app uses in the Play Console, with a description of the use case and a video of it in action. `specialUse` is reviewed by hand against the `specialUseSubtype` you give.

The `voltra` CLI accepts the same key under `android`. When you remove the key, or drop a type, `voltra apply` removes or narrows the service but leaves the `FOREGROUND_SERVICE` permissions in place: a library your app uses may declare a service that needs them, and Voltra cannot tell. Remove them yourself if nothing else needs them, because Play Console asks you to justify every foreground service permission you declare.

For when to use it, see [Keeping the app alive with a foreground service](/android/development/managing-ongoing-notifications#keeping-the-app-alive-with-a-foreground-service).

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
- `initialStatePath`: (optional) Path to a file that exports initial widget state, or a locale map of paths for localized build-time pre-rendering (see [Widget Pre-rendering](/android/development/widget-pre-rendering))
- `previewImage`: (optional) Path to preview image for widget picker (PNG/JPG/WebP)
- `previewLayout`: (optional) Path to custom XML layout for widget picker preview (Android 12+)
- `serverUpdate`: (optional) Fetch the widget's content on a schedule. Without `entry` the server returns a rendered payload; with `entry` it returns plain JSON that the widget renders on the device. `url` is optional — leave it out to supply one at runtime. See [Server-driven widgets](/android/development/server-driven-widgets) for full details.
  - `url`: The Voltra SSR endpoint URL
  - `intervalMinutes`: Update interval in minutes (default: `60`, or `15` for a widget with `entry`; minimum 15)
  - `refresh`: Show a native refresh button (default: `false`)
- `appIntent`: (optional, Dynamic Widgets) Configuration parameters the widget reads from `env.configuration`. Each has a `name`, an optional `default` used until `setWidgetConfiguration` changes it, an optional `title` and optional `options` (`[{ "value": "metric", "title": "Metric" }]`), each with a required `title`. Titles accept plain strings or locale maps. See [Localization](/android/development/localization#translate-the-picker-and-configuration-copy)

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

For widget sizing math and widget-picker preview setup (`previewImage`, `previewLayout`), see [Widget Sizing & Previews](/android/api/widget-sizing-and-previews).

## Widget Pre-rendering

Use `initialStatePath` to bundle pre-rendered widget state for the first time a widget is added to the home screen. See [Widget Pre-rendering](/android/development/widget-pre-rendering) for details.

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
