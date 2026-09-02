---
'@use-voltra/ios-client': patch
---

Server-driven iOS widgets now keep showing the latest server content when the native refresh button is tapped, when several widget instances reload at once, or when a fetch fails. Previously such reloads could reset the widget to its initial state when no App Group was configured or when locally pushed timeline data existed.
