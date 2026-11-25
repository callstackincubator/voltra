---
'@use-voltra/android-client': minor
---

Let an Android Dynamic Widget parameter pick from choices the app sets at runtime with `setWidgetParameterOptions` (`dynamicOptions: true`) via long-press Reconfigure (`VoltraWidgetConfigureActivity`), and fill `{name}` placeholders in a server-driven widget's `serverUpdate` URL from each placement's configuration. Reconfigure asks for each `dynamicOptions` parameter in declared order. As on iOS, a parameter with no choices is `""`, `setWidgetParameterOptions` rejects empty or duplicate values, and `clearWidget` and `clearAllWidgets` also remove the stored choices.
