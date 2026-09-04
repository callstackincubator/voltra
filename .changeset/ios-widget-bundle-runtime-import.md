---
'voltra': patch
---

Fixed widget extension builds failing on Xcode 27 with `Unable to resolve module dependency:
'VoltraWidget'`. The CLI's generated `VoltraWidgetBundle.swift` imported `VoltraWidget`, but both
CocoaPods podspecs compile that code under the module name `VoltraRuntime` (required so
`ActivityAttributes` types match across the app and widget extension process boundary). Earlier
Xcode versions tolerated the mismatched import; Xcode 27's stricter explicit-module-build
dependency resolution rejects it. The generated import now matches the actual module name.

Re-running the `voltra` CLI regenerates `VoltraWidgetBundle.swift` with the corrected import.
