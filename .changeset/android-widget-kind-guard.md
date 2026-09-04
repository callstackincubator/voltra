---
'@use-voltra/android-client': minor
---

Android widgets now resolve their kind (payload-driven vs. Dynamic Widget) before acting on a call, instead of a wrong call silently leaving the widget stuck on "Loading…" (issue #222):

- `updateAndroidWidget` now rejects with `VOLTRA_WIDGET_KIND_MISMATCH` when called on a Dynamic Widget instead of silently leaving it in the loading state. `updateAndroidDynamicWidget` and `setWidgetConfiguration` now reject with `VOLTRA_WIDGET_KIND_MISMATCH` when called on a payload-driven widget, and with `VOLTRA_WIDGET_NOT_FOUND` for an unknown widget id. Callers that previously ignored these promises may now see a rejection.
- Dynamic Widget placeholders are read only from the bundled initial-states asset and are no longer affected by payload data written by an older app version.
- Server-driven refresh (the background worker and the widget's refresh button) now skips widgets that are not payload-driven, rather than writing payload data for them.
- Pin previews (`requestPinGlanceAppWidget`) now compose payload-driven widgets with their registered renderer; Dynamic Widgets rely on the launcher's own provider preview.
