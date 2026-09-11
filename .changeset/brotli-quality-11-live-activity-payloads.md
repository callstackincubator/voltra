---
'@use-voltra/ios': minor
'@use-voltra/ios-server': minor
---

Server-rendered Live Activity payloads from `renderLiveActivityToString` are now compressed at brotli quality 11 instead of quality 2, making them 10 to 27 percent smaller. Compression costs a few milliseconds of CPU per payload on the server and the app-side decoder is unchanged.
