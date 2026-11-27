---
'@use-voltra/android-client': patch
'@use-voltra/ios-client': patch
---

Settings passed to `setWidgetServerUpdate(..., { widgetId })` now apply to server-driven Dynamic Widgets that have configuration parameters. Before, those widgets ignored the widget's URL, interval, method, headers and body, and used the global or app.json values.
