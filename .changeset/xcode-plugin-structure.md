---
'@use-voltra/ios-client': minor
---

Restructure the widget Xcode integration and fix signing, versioning, and misconfiguration behavior.

- Widget code signing now mirrors the main app per build configuration (Debug→Debug,
  Release→Release) instead of copying the first configuration's settings into both, so
  manual-signing release builds get the correct provisioning profile.
- The widget's `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` now follow `expo.version`
  and `expo.ios.buildNumber` (falling back to the previous `1.0`/`1` when unset), matching
  App Store Connect's requirement that an appex version match its host app.
- The plugin now throws an actionable error when `expo.ios.bundleIdentifier` is missing
  instead of silently skipping widget setup.
- Internally, target setup is collapsed into a single idempotent ensure pipeline and build
  phases are matched semantically rather than by comment strings.
