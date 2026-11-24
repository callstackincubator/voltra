---
'@use-voltra/android-client': minor
---

Dynamic Widgets on Android can export `timeline(props)` from their entry to redraw at known times between fetches using per-placement `AlarmManager.RTC` alarms, so a countdown or schedule changes on time instead of waiting for the next 15-minute WorkManager fetch.
