---
'@use-voltra/android-client': minor
---

Android Dynamic Widgets no longer hide render failures. A debug build now shows an error view on the Home Screen with the widget id, the failing stage, the error message and the stack, and tapping it reloads the bundle from Metro and retries, so a Metro outage that began before the widget was placed no longer sticks until the process restarts. A release build keeps the last render of each placement that succeeded instead of falling back to the placeholder after a bad props update, locale change or resize. Each failure is logged once under the `VoltraDynamicWidget` tag.
