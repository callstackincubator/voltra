---
'@use-voltra/expo-plugin': major
'voltra': major
---

**Breaking change.** Voltra’s iOS native code now requires a **minimum deployment target of iOS 16.4** (bumped from the previous minimum). Raise it everywhere it matters—Xcode targets, `expo-build-properties`, CocoaPods, and CI—so you are not still building for 16.3 or lower.

This release also brings **Expo SDK 56** compatibility; you can upgrade Expo on your own timeline and you **do not** need to be on SDK 56 before adopting this Voltra version.
