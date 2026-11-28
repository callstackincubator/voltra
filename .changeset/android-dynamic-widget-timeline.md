---
'@use-voltra/android-client': minor
---

Any Dynamic Widget on Android, server-driven or not, can export `timeline(props)` from its entry to redraw at known times between props updates, using one inexact `AlarmManager.RTC` alarm per placement, so a schedule changes within 10 minutes of each time instead of waiting for the next props update. The alarm is scheduled from the props whether or not the render succeeds, and a widget without the export costs nothing extra.
