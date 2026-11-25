---
'@use-voltra/android-client': minor
---

Any Dynamic Widget on Android, server-driven or not, can export `timeline(props)` from its entry to redraw at known times between props updates using per-placement `AlarmManager.RTC` alarms, so a countdown or schedule changes within about 10 minutes of each time instead of waiting for the next 15-minute WorkManager fetch.
