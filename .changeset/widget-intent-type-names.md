---
'@use-voltra/ios-client': minor
'@use-voltra/expo-plugin': minor
'voltra': patch
---

Let a configurable widget name its generated intent (`appIntent.intentName`) and a `dynamicOptions` entity (`entityName`), so moving an existing widget to Voltra keeps the Edit Widget choices people made. Widgets that share the names share one generated type. Prebuild rejects names that would not compile or would collide: Swift keywords, types the generated Swift uses, names starting with `Voltra`, and widgets sharing an intent with different parameters. Both options work with Expo prebuild only; `voltra apply` stops with an error instead of dropping them.
