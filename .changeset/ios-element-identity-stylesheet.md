---
'@use-voltra/ios-client': patch
---

Fix stale styles on iOS when a payload only changes a deduplicated style. `VoltraElement`
compared the stylesheet *index* it was given rather than the style that index points at, so
SwiftUI's Equatable fast path skipped re-rendering an element whose content was unchanged and
kept the previous style — most visibly on a widget timeline entry that recolors an otherwise
identical label.
