---
'@use-voltra/ios-client': patch
---

The in-app `VoltraView` now starts from its own default props. It used to read its first props from the base view's default props, which aborted Debug builds (seen on React Native 0.88 / Expo SDK 58) and was undefined behaviour in Release builds.
