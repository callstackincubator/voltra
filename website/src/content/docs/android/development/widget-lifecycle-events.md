---
title: "Widget Lifecycle Events"
description: "Find out when a user places, resizes, removes or restores one of your Android Dynamic Widgets, even while your app was closed, with addVoltraListener."
---

Voltra tells your app when a user places, resizes, removes or restores one of your [Dynamic Widgets](/android/development/dynamic-widgets), and when the first placement of a widget type appears or the last one goes away. Use these events to seed a new placement's configuration, stop app-side work for a removed one, or send props suited to a new size.

Events are recorded natively whether or not your app is running. A placement made while your app was closed reaches you the next time your app listens.

Lifecycle events are Android only, and only Dynamic Widgets produce them. Payload-driven widgets produce none.

## Listen at the root of your app

Subscribe with `addVoltraListener`, once, in a component that mounts with your app:

```tsx
import { useEffect } from 'react'
import { addVoltraListener, setWidgetInstanceConfiguration } from '@use-voltra/android-client'

export function WidgetLifecycle() {
  useEffect(() => {
    const subscriptions = [
      addVoltraListener('widgetAdded', (event) => {
        if (event.widgetType === 'weather') {
          setWidgetInstanceConfiguration(event.appWidgetId, 'city', 'London')
        }
      }),
      addVoltraListener('widgetRemoved', (event) => {
        stopStreaming(event.widgetType, event.appWidgetId)
      }),
      addVoltraListener('widgetRestored', (event) => {
        moveAppState(event.previousAppWidgetId, event.appWidgetId)
      }),
    ]
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [])

  return null
}
```

Subscribe to all the events you need together, in one effect. Queued events arrive in the order they happened only among listeners that subscribe together. A listener added later, such as on another screen, may get its events out of order with events of other types, or miss ones already delivered.
## Events

Every event carries:

| Property | Type | Description |
| :--- | :--- | :--- |
| `type` | `string` | The event name, the same as the key you subscribed with. |
| `source` | `string` | Always `"widget"`. |
| `timestamp` | `number` | When the event was recorded. |

The other fields depend on the event:

| Event | Fields | When it fires |
| :--- | :--- | :--- |
| `widgetAdded` | `widgetType`, `appWidgetId`, `width`, `height`, `sizes` | A placement appears that Voltra has not seen before. A widget the user accepts from `requestPinAndroidWidget` arrives the same way. |
| `widgetResized` | `widgetType`, `appWidgetId`, `width`, `height`, `sizes` | A placement's size changes: the user resizes it, or the launcher reports a new size, for example after a reboot. A change of options that leaves the size the same, or only reorders `sizes`, fires nothing. |
| `widgetRemoved` | `widgetType`, `appWidgetId` | The user removes a placement. One event per placement. |
| `widgetRestored` | `widgetType`, `appWidgetId`, `previousAppWidgetId` | A backup restore moves a placement to a new `appWidgetId`. `appWidgetId` is the new id. |
| `widgetEnabled` | `widgetType` | The first placement of a widget type appears. |
| `widgetDisabled` | `widgetType` | The last placement of a widget type is removed. |

`widgetType` is the Voltra widget ID from your config plugin, and `appWidgetId` is the Android identifier of the placement, the same values [`getActiveWidgets()`](/android/development/querying-active-widgets) returns. `width`, `height` and `sizes` are in dp and match the `WidgetInfo` fields of the same name: `sizes` lists the sizes the launcher may show the placement at.

```json
{ "type": "widgetAdded", "source": "widget", "timestamp": 1758540000000,
  "widgetType": "weather", "appWidgetId": 42,
  "width": 250, "height": 110,
  "sizes": [ { "width": 250, "height": 110 }, { "width": 340, "height": 90 } ] }
```

### What does not fire

- **Boot and app updates.** The system re-announces existing placements after a reboot and after your app is updated. Those placements are already known, so neither `widgetAdded` nor `widgetEnabled` fires for them.
- **Restored placements.** A placement moved by a restore arrives as `widgetRestored`, not also as `widgetAdded`. A restored placement Voltra never knew about arrives as `widgetAdded` instead.
- **Several resizes while your app was closed** arrive as one `widgetResized` with the latest size.

## Replay and delivery

When your app is running and listening, an event arrives within moments. Otherwise it waits in a native queue and is delivered in order to the next listeners for its type, or when your app returns to the foreground. Events never start your app's JavaScript in the background.

Each event is delivered at most once: not again after a JavaScript reload or the next launch, and not at all if the app is killed while delivering it. Subscribing to one event type leaves queued events of other types for their own listeners.

The queue keeps lifecycle events for 7 days and holds at most 200 events, dropping the oldest.

## Reconcile with getActiveWidgets() first

Treat the events as hints. `getActiveWidgets()` is the source of truth for which placements exist. At startup, read it and bring your app-side state in line with it, then let the events keep that state current:

```typescript
import { getActiveWidgets } from '@use-voltra/android-client'

const placements = await getActiveWidgets()
syncStreams(placements.filter((widget) => widget.widgetType === 'weather'))
```

### Placements made before the first launch are not reported

After an upgrade to a version with lifecycle events, or after app data is cleared, Voltra records existing placements silently the first time the app or one of its widgets runs, including a placement made at that moment. Reconciling with `getActiveWidgets()` at startup covers these.

## Cleanup you don't need to do

Before `widgetRemoved` fires, Voltra has already dropped the placement's [per-instance configuration](/android/development/dynamic-widgets#configure-each-placed-widget-separately), so reading it returns not found. For a [server-driven widget](/android/development/server-driven-widgets), removal also cancels scheduled fetches that no remaining placement needs. Use `widgetRemoved` for state your app keeps itself, such as sockets, subscriptions or analytics.

After a restore, the placement's configuration has already moved to its new `appWidgetId` when `widgetRestored` fires.
