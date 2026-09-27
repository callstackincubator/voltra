---
'@use-voltra/ios-client': patch
---

`env.locale` in Dynamic Widgets and Dynamic Live Activities on iOS is now a BCP-47 tag such as
`pl-PL`, as documented, instead of the ICU form `pl_PL`. Passing it to `Intl` or `toLocaleString`
no longer throws a `RangeError`. Widgets that parsed the underscore form need to switch to the
hyphenated one.
