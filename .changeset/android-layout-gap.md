---
'@use-voltra/android-client': patch
---

`gap` on Android `Column`, `Row`, `LazyColumn`, and `LazyVerticalGrid` now spaces children apart, as it does on iOS. Before, Android ignored it. On a `LazyVerticalGrid` with adaptive columns, the grid's outer edge also gets half the gap.
