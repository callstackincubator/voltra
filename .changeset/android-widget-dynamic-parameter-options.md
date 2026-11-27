---
'@use-voltra/android-client': minor
---

Let an Android Dynamic Widget parameter take its choices from the app at runtime with `setWidgetParameterOptions` (`dynamicOptions: true`). As on iOS, a placement with no value, or a value no longer offered, uses the first choice, and a parameter with no choices is `""`. `setWidgetParameterOptions` rejects payload-driven widgets, unknown widgets, parameters not declared with `dynamicOptions`, and empty or duplicate values, and `clearWidget` and `clearAllWidgets` also remove the stored choices.
