---
'@use-voltra/android-client': minor
'@use-voltra/android': minor
---

Find out when a user places, resizes, removes or restores one of your Android Dynamic Widgets. `addVoltraListener` now delivers `widgetAdded`, `widgetResized`, `widgetRemoved`, `widgetRestored`, `widgetEnabled` and `widgetDisabled` on Android. Events that happen while your app is closed are kept for up to 7 days and delivered once, in order, the next time your app listens. Placements that already exist when you upgrade, or that the system re-announces at boot or after an app update, produce no events.

`getActiveWidgets()` now returns `sizes` for each placement: the sizes in dp the launcher may show it at. The placement types `VoltraWidgetPlacement`, `VoltraWidgetPlacementSize` and `VoltraWidgetPlacementWithSize` are exported and shared by `WidgetInfo` and the new event types.
