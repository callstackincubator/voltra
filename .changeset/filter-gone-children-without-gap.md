---
'@use-voltra/android-client': patch
---

Hidden children (`display: none` or `visibility: gone`) no longer occupy space
in Column, Row, LazyColumn and LazyVerticalGrid on Android when no gap is set.
