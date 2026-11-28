---
'@use-voltra/ios-client': minor
'@use-voltra/expo-plugin': minor
'voltra': patch
---

Let an Edit Widget parameter pick from choices the app sets at runtime with `setWidgetParameterOptions` (`dynamicOptions: true`). A placement whose choice is no longer listed falls back to the first choice, and with no choices the parameter is `""`. Each placement's choice is part of its server request `configuration`, so server-driven widgets fetch per choice. `setWidgetParameterOptions` rejects empty or duplicate values, an unknown widget (`VOLTRA_WIDGET_NOT_FOUND`), a payload-driven widget (`VOLTRA_WIDGET_KIND_MISMATCH`) and a parameter not declared with `dynamicOptions` (`VOLTRA_WIDGET_PARAMETER_NOT_DECLARED`), and `clearWidget` and `clearAllWidgets` also remove the stored choices. `dynamicOptions` works with Expo prebuild only; `voltra apply` stops with an error instead of dropping it.
