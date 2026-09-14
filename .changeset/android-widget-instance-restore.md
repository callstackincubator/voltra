---
'@use-voltra/android-client': minor
---

Per-instance Dynamic Widget configuration now survives a launcher restore. When
Android restores the home screen from a backup and assigns new widget ids, each
placement's values move to its new id, so a widget configured for London still
shows London afterwards instead of falling back to the widget-type values.
Server-driven widgets reschedule their per-configuration fetches under the new
ids at the same time.
