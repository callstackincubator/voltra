---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
---

Android Dynamic Widget colors can now be a `{ day, night }` pair, so a widget shows one color in the light system theme and another in the dark one without re-running its JavaScript. Pairs work on style colors, component color props, chart mark colors and `foregroundStyleScale`, arc `gradientColors`, and as a pair of whole gradients on `backgroundImage`.

Pair sides now only accept literal colors, so an `AndroidDynamicColors` token inside a pair fails to compile. This also rejects a side typed as plain `string`, which `background({ day, night })` accepted since 2.4.0: give such values a literal color type, for example with `as const` or as `` `#${string}` ``.
