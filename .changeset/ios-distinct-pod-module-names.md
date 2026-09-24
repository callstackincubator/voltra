---
'@use-voltra/ios-client': patch
---

iOS builds no longer fail with "Multiple commands produce … Metadata.appintents"
or a missing `VoltraRuntime-Swift.h` when the app uses `use_frameworks!`
(`ios.useFrameworks` in app.json, common on EAS). Since 2.3.0 the `Voltra` and
`VoltraWidget` pods shared one module name, so under frameworks linkage they
produced identically named build products. The widget extension pod now compiles
as `VoltraWidgetRuntime` while the app pod stays `VoltraRuntime`; run
`expo prebuild` again after updating so the generated Swift files pick up the
new import.
