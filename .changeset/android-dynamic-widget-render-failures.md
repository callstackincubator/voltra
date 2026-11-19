---
'@use-voltra/android-client': minor
---

Android Dynamic Widgets no longer hide render failures. A debug build now shows an error view on the Home Screen with the widget id, the failing stage, the error message and the stack, and tapping it reloads the bundle from Metro and retries, so a Metro outage that began before the widget was placed no longer sticks for the rest of the widget's session. A release build keeps the last render of each placement and size that succeeded instead of falling back to the placeholder after a bad props update or locale change. Each failed render is logged under the `VoltraDynamicWidget` tag.
