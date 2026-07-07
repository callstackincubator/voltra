---
'@use-voltra/ios-client': patch
---

Fix Xcode project corruption when the app already contains another app extension.

The config plugin now scopes all pbxproj mutations to the widget's own objects: file
references resolve through the widget's PBXGroup instead of by bare path, build phases are
created empty and populated without adopting other targets' PBXBuildFiles, and an existing
"Embed App Extensions" phase is reused (detected via `dstSubfolderSpec == 13`) instead of
duplicated. Resolves the `[Xcodeproj] Consistency issue: no parent for object` and
`Cycle inside <target>` failures during `pod install`, and makes repeated `expo prebuild`
runs idempotent.
