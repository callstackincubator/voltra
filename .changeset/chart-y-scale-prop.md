---
'@use-voltra/android-client': minor
'@use-voltra/ios-client': minor
'@use-voltra/android': minor
'@use-voltra/core': minor
'@use-voltra/ios': minor
---

Charts accept a `yScale` prop that pins the y-axis. Pass `{ min, max }` for a fixed window, or a
single bound such as `{ min: 0 }` to keep the baseline at zero while the other side follows the
data. Pinned bounds win over the automatic range on both platforms, and values outside them are
clipped to the plot.
