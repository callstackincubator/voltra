---
'@use-voltra/ios-client': patch
---

After a normal launch, the React tree on iOS no longer remounts on the first foreground or on the first `isHeadless()` / `useIsHeadless()` call.
