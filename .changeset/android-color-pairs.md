---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
---

Android Dynamic Widget colors can now be a `{ day, night }` pair, so a widget shows one color in the light system theme and another in the dark one without re-running its JavaScript. Pairs work on style colors, component color props, chart mark colors and `foregroundStyleScale`, arc `gradientColors`, and as a pair of whole gradients on `backgroundImage`.
