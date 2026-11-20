---
'@use-voltra/ios-client': minor
---

iOS Dynamic Widgets no longer hide render failures. A debug build now shows an error view on the Home Screen with the widget id, the failing stage, the error message and the stack, and on iOS 17 and later tapping it reloads the bundle from Metro and retries. A release build keeps the last render of each widget, configuration, size and appearance that succeeded instead of falling back to the placeholder after a bad props update or locale change. Each failed render is logged under the `widget` category. A Dynamic Live Activity bundle that throws while evaluating now fails the evaluation even after an earlier good evaluation in the same JavaScript context, where it used to keep silently using the previous `render`.
