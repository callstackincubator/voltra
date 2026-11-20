---
'@use-voltra/ios-client': patch
---

iOS gradients whose color stops have no explicit positions, such as `linear-gradient(to right, red, blue)`, now render. Before, they rendered nothing unless the first and last stops had positions, so `radial-gradient(circle, red, blue)`, `conic-gradient(red, blue)` and `linear-gradient(to right, red 0%, blue)` were all affected.
