# Querying Active Widgets

On Android, you can detect every active instance of your widgets currently placed on the Home Screen. This is particularly useful for Android since each widget instance can have different dimensions and a unique `widgetId`.

## getActiveWidgets API

The `getActiveWidgets` function returns a promise that resolves to an array of all active widget instances for your app.

```typescript
import { getActiveWidgets } from 'voltra/android'

async function checkAndroidWidgets() {
  const activeWidgets = await getActiveWidgets()

  console.log(`Found ${activeWidgets.length} active widget instances`)

  activeWidgets.forEach(widget => {
    console.log(`- Widget Name: ${widget.name}`)
    console.log(`  ID: ${widget.widgetId}`)
    console.log(`  Size: ${widget.width}x${widget.height}dp`)
  })
}
```

### WidgetInfo Object

Each object in the returned array contains:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The unique ID of the widget as defined in your Expo config plugin (e.g., `"weather"`). |
| `widgetId` | `number` | The unique system identifier for this specific widget instance. |
| `providerClassName` | `string` | The full class name of the widget provider (e.g., `".widget.VoltraWidget_weatherReceiver"`). |
| `label` | `string` | The human-readable label shown in the Android widget picker. |
| `width` | `number` | The current width of the widget instance in dp. |
| `height` | `number` | The current height of the widget instance in dp. |
