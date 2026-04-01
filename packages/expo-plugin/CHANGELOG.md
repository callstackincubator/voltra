# @use-voltra/expo-plugin

## 1.3.0

### Patch Changes

- 68271bb: Fix `pod install` failing with "multiple dependencies with different sources for VoltraWidget" when using pnpm or bun (symlinked node_modules). The plugin now resolves the VoltraWidget path to its real path so CocoaPods sees a single source.
