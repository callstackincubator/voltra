---
'@use-voltra/ios': minor
'@use-voltra/ios-client': minor
---

iOS views now support the `backgroundImage` style property for CSS gradients, matching Android. The gradient is painted above `backgroundColor`, so a semi-transparent gradient can sit on a solid base color. Gradient strings in `backgroundColor` keep working.
