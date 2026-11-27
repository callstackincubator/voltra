---
'@use-voltra/android-client': patch
---

Children hidden with `display: 'none'` or the `visibility('gone')` modifier no longer leave
an empty space in Column, Row, LazyColumn and LazyVerticalGrid on Android 11 and older.
