---
'@use-voltra/ios-client': patch
---

`VoltraView` now updates its content in place instead of rebuilding it on every change, so
`animation`, `transition` and `contentTransition` modifiers animate in the app as they do in widgets
and Live Activities, and view state such as a timer's start time survives updates.
