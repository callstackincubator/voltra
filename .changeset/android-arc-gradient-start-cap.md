---
'@use-voltra/android-client': patch
---

An Android `ArcProgressIndicator` with `gradientColors` now draws each round cap in the color of its own end. Before, the cap where a clockwise arc starts, or where a counter-clockwise arc ends, took the color from the other end.
