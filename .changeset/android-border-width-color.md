---
'@use-voltra/android-client': minor
---

Android widgets now draw `borderWidth` and `borderColor`, following `borderRadius` and combining with `backgroundColor` or `backgroundImage`. The border is drawn inside the component's bounds without changing its layout, and only on components whose `width` and `height` are both fixed numbers.
