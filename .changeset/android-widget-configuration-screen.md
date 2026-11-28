---
'@use-voltra/android-client': minor
'voltra': patch
---

An Android Dynamic Widget can set `configurationScreen: true` to let users change a placement's `appIntent` values from the launcher's Reconfigure action on Android 12 and newer. The screen lists every parameter (fixed `options`, `dynamicOptions` choices from `setWidgetParameterOptions`, and free text) and saves the changes as that placement's own values, like `setWidgetInstanceConfiguration`. Adding the widget does not open it, and below Android 12 nothing changes. Voltra Apply stops with an error if a widget sets it.
