---
'@use-voltra/ios-client': minor
'@use-voltra/expo-plugin': minor
'voltra': patch
---

Let an Edit Widget parameter pick from choices the app sets at runtime with `setWidgetParameterOptions` (`dynamicOptions: true`), and fill `{name}` placeholders in a server-driven widget's `serverUpdate` URL from each placement's configuration. With no choices the parameter is `""` and a URL that needs it isn't fetched. `setWidgetParameterOptions` rejects empty or duplicate values, and `clearWidget` and `clearAllWidgets` also remove the stored choices. `dynamicOptions` works with Expo prebuild only; `voltra apply` stops with an error instead of dropping it.
