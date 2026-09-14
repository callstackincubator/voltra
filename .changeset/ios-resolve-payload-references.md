---
'@use-voltra/ios-client': patch
---

Widgets and Live Activities on iOS now pick up a style change even when the payload
reuses the same deduplicated style slot, so a timeline entry that only recolors an
otherwise unchanged label no longer keeps the previous colour on screen. The same
applies to labels, gauge and progress captions, mask elements and image fallbacks
whose content is shared between elements.
