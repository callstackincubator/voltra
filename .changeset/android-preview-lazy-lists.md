---
'@use-voltra/android-client': patch
---

`LazyColumn` and `LazyVerticalGrid` now render in `VoltraWidgetPreview` instead of showing
nothing. On Android 12 (API 31) and older they render as a non-scrolling approximation, since
Glance's collection adapters require a real AppWidget host on those versions.
