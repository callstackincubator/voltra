---
"voltra": minor
"@use-voltra/ios-client": minor
"@use-voltra/expo-plugin": minor
---

Widgets on iOS show the same content regardless of who placed them or what they care about. A stock widget always shows the same ticker, a weather widget always shows the same city — unless the React Native app explicitly pushes new content. This makes it impossible to give users a way to personalise what a widget shows without opening the app and navigating somewhere.

**Configurable widgets** (iOS 17+) solve this. You declare a set of parameters in the Voltra plugin config; iOS automatically surfaces them as native controls in the "Edit Widget" sheet. The user can pick a name, choose a theme, toggle a flag — all without opening your app. Voltra stores the chosen values in the shared App Group, so your React Native code can read them via `getWidgetParameters()` on next launch and re-render the widget accordingly.

For server-driven widgets the integration is seamless: parameter values are appended as query parameters on every server fetch, so the server can return personalised content without the app ever needing to be open.

**New plugin config options on `widgets[]`:**

- `parameters` — array of configurable parameters (`bool`, `int`, `double`, `enum`). Each one becomes a native control in the iOS widget edit sheet.
- `outdatedStatePath` — path to a pre-rendered state shown when the user has changed parameters but the app hasn't re-rendered the widget yet (non-server widgets only).

**New JS API (`@use-voltra/ios-client`, re-exported via `voltra/client`):**

- `getWidgetParameters(widgetId)` — returns the current parameter values as `Record<string, string>`, as last set by the widget extension when the user edited the widget.
