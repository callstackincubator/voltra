---
'@use-voltra/ios-client': patch
---

Release builds of iOS Dynamic Widgets now include each widget's JS bundle after a fresh `expo prebuild` (including EAS and other CNG builds). Before, the widget extension's bundling step was overwritten to bundle only Live Activities, so widgets couldn't load their bundle in release.
