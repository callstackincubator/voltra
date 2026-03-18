---
'@voltra/expo-plugin': patch
---

Fix `pod install` failing with "multiple dependencies with different sources for VoltraWidget" when using pnpm or bun (symlinked node_modules). The plugin now resolves the VoltraWidget path to its real path so CocoaPods sees a single source.
