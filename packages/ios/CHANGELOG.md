# @use-voltra/ios

## 1.3.0

### Minor Changes

- 27e3db1: Add chart components for iOS and Android widgets and Live Activities, including bar, line, area, point, rule, and pie/donut charts.
- 672d91f: Add support for server-driven Home Screen widgets on iOS and Android, so widgets can refresh with content from your backend even when the app is closed.

### Patch Changes

- 0d30973: Fixed duplicate push-to-start token events being fired when a Live Activity starts or ends. Previously, iOS would re-deliver the same token on activity lifecycle changes, causing spurious token update callbacks to reach JavaScript. These duplicates are now suppressed.

  Fixed image preloading to correctly propagate errors so callers receive accurate failure information when images cannot be downloaded or saved.

- b1efcad: Fix timer digits shifting during countdown and stopwatch in relative mode.
