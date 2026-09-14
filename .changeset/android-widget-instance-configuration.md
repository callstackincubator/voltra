---
'@use-voltra/android-client': minor
'@use-voltra/android': minor
---

Configure each placed Android Dynamic Widget separately. Every widget on the
Home Screen has its own `appWidgetId`, so one placement can now show London
and another New York without the widget code changing — it still reads
`env.configuration` and gets the values of the placement being drawn. Write
them with `setWidgetInstanceConfiguration`, one key at a time or several at
once, read them back with `getWidgetInstanceConfiguration`, and drop them with
`clearWidgetInstanceConfiguration` so the placement follows the widget-type
values again. `setWidgetConfiguration` keeps writing the value every
unconfigured placement renders, and `getWidgetConfiguration` reads that layer
on its own. Removing a widget from the Home Screen drops its values, so adding
it again starts fresh. `getActiveWidgets` entries gain `appWidgetId` and
`widgetType`, which say which is the Android placement and which is the Voltra
widget; the old `widgetId` and `name` keep their values and are deprecated.
Existing configuration keeps working with no migration.
