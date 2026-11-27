---
title: "Querying Active Widgets"
description: "Find every Voltra widget instance placed on the Android Home Screen, with its appWidgetId, widget type, and size, using getActiveWidgets."
---

On Android, you can detect every active instance of your widgets currently placed on the Home Screen. This is particularly useful for Android since each widget instance can have different dimensions and a unique `appWidgetId`.

## getActiveWidgets API

The `getActiveWidgets` function returns a promise that resolves to an array of all active widget instances for your app.

```typescript
import { getActiveWidgets } from '@use-voltra/android-client'

async function checkAndroidWidgets() {
  const activeWidgets = await getActiveWidgets()

  console.log(`Found ${activeWidgets.length} active widget instances`)

  activeWidgets.forEach(widget => {
    console.log(`- Widget: ${widget.widgetType}`)
    console.log(`  Placement: ${widget.appWidgetId}`)
    console.log(`  Size: ${widget.width}x${widget.height}dp`)
  })
}
```

### WidgetInfo Object

Each object in the returned array contains:

| Property | Type | Description |
| :--- | :--- | :--- |
| `widgetType` | `string` | The Voltra widget ID as defined in your Expo config plugin (e.g., `"weather"`). |
| `appWidgetId` | `number` | The Android identifier of this placement. Pass it to the [per-instance configuration APIs](/android/development/dynamic-widgets#configure-each-placed-widget-separately) to give one placement its own values. |
| `providerClassName` | `string` | The full class name of the widget provider (e.g., `".widget.VoltraWidget_weatherReceiver"`). |
| `label` | `string` | The human-readable label shown in the Android widget picker. |
| `width` | `number` | The current width of the widget instance in dp. |
| `height` | `number` | The current height of the widget instance in dp. |
| `sizes` | `{ width: number; height: number }[]` | The sizes in dp the launcher may show this placement at. On Android 12 and later this is the launcher's own list, without duplicates. On older versions, or when the launcher reports none, it is a portrait and a landscape estimate from the placement's minimum and maximum bounds. |
| `name` | `string` | **Deprecated.** Renamed to `widgetType`, which says what it holds. Same value. |
| `widgetId` | `number` | **Deprecated.** Renamed to `appWidgetId`. It is the Android placement identifier, not the Voltra widget ID that `widgetId` names everywhere else in this package. Same value. |

The same widget placed twice appears twice, with one entry per placement and a different `appWidgetId` on each.

To find out when a placement is added, resized, removed or restored, instead of calling `getActiveWidgets()` again and comparing, listen for [widget lifecycle events](/android/development/widget-lifecycle-events). Their placements carry the same `widgetType`, `appWidgetId`, `width`, `height` and `sizes`.
