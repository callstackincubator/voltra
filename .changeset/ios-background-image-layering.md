---
'@use-voltra/ios': minor
'@use-voltra/ios-client': minor
---

iOS now supports `style.backgroundImage` with CSS gradients (`linear-gradient`, `radial-gradient`, `conic-gradient`), so the same style renders its gradient on both iOS and Android. The gradient is painted over `backgroundColor`. Gradient strings in `backgroundColor` keep working.
