# iOS Widgets

Use this reference for iOS widget UI, scheduled widgets, widget families, or iOS widget runtime APIs.

## Domain Rules

- Use `Voltra` from `voltra` for iOS widget UI trees.
- Use `voltra/client` for iOS widget APIs such as `updateWidget`, `scheduleWidget`, `reloadWidgets`, `clearWidget`, `clearAllWidgets`, `getActiveWidgets`, and `VoltraWidgetPreview`.
- Do not use `VoltraAndroid` or Android widget primitives in iOS widget code.
- Widget registration lives in the Voltra plugin config. If the task includes `widgets`, `supportedFamilies`, or `initialStatePath`, also read `app-config.md`.
- If the task includes `serverUpdate`, widget polling intervals, widget auth credentials, or `createWidgetUpdateHandler`, also read `server-driven-widgets.md`.
- `VoltraWidgetPreview` is a React Native preview component for app screens, not a Voltra widget primitive to nest inside widget JSX.
- Use `scheduleWidget` for timeline-based or scheduled widget updates instead of inventing background schedulers or native WidgetKit code.
- Use `serverUpdate` plus a Voltra server handler for remote widget content instead of inventing custom WidgetKit networking or native extension code.
- For images, use `Voltra.Image` with bundled `assetName`s or preloaded keys. If shared image resources change, use `reloadWidgets`.

## Preferred APIs

- `VoltraWidgetPreview`
- `updateWidget`
- `scheduleWidget`
- `reloadWidgets`
- `clearWidget`
- `clearAllWidgets`
- `getActiveWidgets`
- `WidgetFamily`
- `setWidgetServerCredentials`
- `clearWidgetServerCredentials`

## Sources

- `widget-families.md`
