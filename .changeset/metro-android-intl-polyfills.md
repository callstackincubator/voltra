---
'@use-voltra/metro': minor
---

`withVoltra(config, { androidIntlPolyfills: { locales: ['en', 'pl'] } })` adds the FormatJS
polyfills for `Intl.PluralRules`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`, `Intl.DisplayNames`
and `Intl.Locale` to Android widget bundles, with locale data for the listed languages. These APIs
are otherwise missing in Android widgets. iOS bundles are unchanged. Install the `@formatjs/*`
packages in the app first; Metro names any that are missing.
