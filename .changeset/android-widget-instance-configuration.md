---
'@use-voltra/android-client': minor
'@use-voltra/android': minor
---

Add per-instance configuration for Android Dynamic Widgets, so two placements of
the same widget can show different data. Configuration now resolves in three
layers — code defaults, widget-type values, then per-instance values, with the
most specific layer winning. Write instance values with
`setWidgetInstanceConfiguration` (one key, or several at once in a single
re-render), read the merged result the widget sees with
`getWidgetInstanceConfiguration` and `getWidgetConfiguration`, and reset an
instance with `clearWidgetInstanceConfiguration`. An instance's values are
cleared when its widget is removed from the home screen, so a recycled widget id
never inherits stale configuration. `WidgetInfo` gains the clearly named
`appWidgetId` and `widgetType` fields; the existing `widgetId` and `name` fields
still work but are misleadingly named and should be migrated.
