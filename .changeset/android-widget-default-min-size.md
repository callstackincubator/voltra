---
'voltra': minor
'@use-voltra/android-client': minor
---

Android widgets configured with only `targetCellWidth`/`targetCellHeight` now get a correct
default size on Android 11 and older. Those attributes are an Android 12+ concept; older devices
ignore them and place widgets by `minWidth`/`minHeight` in dp instead, and Voltra previously only
emitted those when they were set explicitly. Such a widget had no declared size before Android 12,
so launchers placed it at the smallest size that would fit rather than the size it asked for.

`minWidth`/`minHeight` are now always emitted. When not set explicitly they are derived from the
widget's cell size, using the deprecated `minCellWidth`/`minCellHeight` if present and
`targetCellWidth`/`targetCellHeight` otherwise. The cell-to-dp conversion also moves from the
legacy `cells * 70 - 30` to the figures Google currently publishes, which place widgets correctly
on more devices — the previous 2-cell width of 110dp fit inside a single cell on tablets, where a
cell can measure 111dp. Cell size still varies by device, launcher and orientation, so the
conversion remains an approximation; set `minWidth`/`minHeight` explicitly if you need precise
placement on Android 11 and older. `minCellWidth` and `minCellHeight` still work but are
deprecated in favor of `minWidth`/`minHeight`.

Re-running the plugin or the `voltra` CLI regenerates each widget's `appwidget-provider` XML with
the new `minWidth`/`minHeight` values, so those generated files will show as changed.
