# Querying Active Widgets

On Android, you can detect every active instance of your widgets currently placed on the Home Screen. This is particularly useful for Android since each widget instance can have different dimensions and a unique `widgetId`.

## getActiveWidgets API

The `getActiveWidgets` function returns a promise that resolves to an array of all active widget instances for your app.

```typescript
import { getActiveWidgets } from '@use-voltra/android-client'

async function checkAndroidWidgets() {
  const activeWidgets = await getActiveWidgets()

  console.log(`Found ${activeWidgets.length} active widget instances`)

  activeWidgets.forEach(widget => {
    console.log(`- Widget Type: ${widget.widgetType}`)
    console.log(`  Instance: ${widget.appWidgetId}`)
    console.log(`  Size: ${widget.width}x${widget.height}dp`)
  })
}
```

### WidgetInfo Object

Each object in the returned array contains:

| Property | Type | Description |
| :--- | :--- | :--- |
| `widgetType` | `string` | The widget ID as defined in your Expo config plugin (e.g., `"weather"`), shared by every placement of that widget. |
| `appWidgetId` | `number` | The Android system identifier for this specific placed instance. Pass this to the [instance configuration APIs](./dynamic-widgets#configuration). |
| `providerClassName` | `string` | The full class name of the widget provider (e.g., `".widget.VoltraWidget_weatherReceiver"`). |
| `label` | `string` | The human-readable label shown in the Android widget picker. |
| `width` | `number` | The current width of the widget instance in dp. |
| `height` | `number` | The current height of the widget instance in dp. |

:::note
`name` and `widgetType` hold the same value, as do `widgetId` and `appWidgetId`. The older `name` and `widgetId` names are misleading — `widgetId` is the *instance* id, not the widget's ID — so prefer `widgetType` and `appWidgetId`. The old fields still work.
:::
