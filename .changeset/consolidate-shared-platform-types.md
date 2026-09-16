---
'@use-voltra/core': patch
'@use-voltra/ios': patch
'@use-voltra/android': patch
---

Shared plumbing types (`EventSubscription`, the `PreloadImage*` types, and the
`WidgetServer*` types) now have one canonical definition in `@use-voltra/core` instead of
duplicated copies in `@use-voltra/ios` and `@use-voltra/android`. Import surfaces are unchanged:
both platform packages still export these names, and `UpdateWidgetOptions` remains iOS-only.
