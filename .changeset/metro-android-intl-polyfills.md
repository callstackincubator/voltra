---
'@use-voltra/metro': minor
---

`withVoltra(config, { androidIntlPolyfills: { locales } })` loads the FormatJS polyfills for the
`Intl` APIs Hermes lacks (`PluralRules`, `RelativeTimeFormat`, `ListFormat`, `DisplayNames`,
`Locale`) into Android widget bundles, with locale data for the listed languages. iOS bundles are
unchanged. The `@formatjs/*` packages must be installed in the app.
