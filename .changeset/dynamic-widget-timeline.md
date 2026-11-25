---
'@use-voltra/ios-client': minor
'@use-voltra/metro': minor
---

Server-driven Dynamic Widgets on iOS can export `timeline(props)` from their entry to be drawn again at known times between fetches, while they have a URL and the app has not taken them over, so a countdown or a schedule changes on time instead of at the next fetch.
