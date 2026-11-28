---
'@use-voltra/ios-client': minor
'@use-voltra/metro': minor
'voltra': minor
---

Dynamic Widgets on iOS can export `timeline(props)` from their entry to be drawn again at known times between reloads and fetches, so a schedule changes on time instead of at the next reload. It works with or without a `serverUpdate`. The export returns `Date`s or epoch milliseconds; anything other than an array of Dates or epoch milliseconds throws and is logged. A widget without the export costs nothing extra.
