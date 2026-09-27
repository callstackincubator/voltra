---
'@use-voltra/ios-client': patch
---

On iOS, `env.locale` in Dynamic Widgets and Dynamic Live Activities is now a BCP-47 tag such as
`pl-PL` instead of `pl_PL`, matching Android and the documented type. Passing it to `Intl` or
`toLocaleString` no longer throws a `RangeError`. If your widget compared `env.locale` against the
underscore form, switch to the hyphenated one.
