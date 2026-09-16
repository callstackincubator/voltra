---
'voltra': patch
---

`voltra apply` now warns about two widget configurations it used to accept in silence: an
`appIntent` on a widget with no `entry`, whose parameters never reach the generated project, and a
project that declares a Dynamic Widget without `@use-voltra/metro` installed, which leaves the
widget rendering its prerendered initial state forever.
