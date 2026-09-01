---
'voltra': minor
'@use-voltra/android-client': minor
---

Android widgets can now declare resize bounds: `minResizeWidth`, `minResizeHeight`, `maxResizeWidth`,
and `maxResizeHeight`, all optional and in dp. The `minResize*` pair sets the smallest size a user can
resize the widget to and is supported on all Android versions; the `maxResize*` pair sets the largest
size and is honoured from Android 12 on, and ignored by older versions. Both pairs are
pass-through — set what you need and Voltra emits exactly that, so existing widgets are unaffected.

Android silently ignores a resize bound that contradicts the widget's minimum size — for example
`minResizeWidth` greater than `minWidth`, or `maxResizeWidth` smaller than `minWidth` — and likewise
for the height pair against `minHeight`. Voltra now warns at build time, naming the attribute, when it
detects one of these contradictions, rather than failing the build.
