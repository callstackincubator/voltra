# Widget Families

Use these iOS widget families when defining `WidgetVariants`:

- `systemSmall`
- `systemMedium`
- `systemLarge`
- `systemExtraLarge`
- `accessoryCircular`
- `accessoryRectangular`
- `accessoryInline`

Working rules:

- Build widget content with `Voltra.*` components.
- Use `VoltraWidgetPreview` from `voltra/client` to preview widget content in React Native screens.
- Use `updateWidget` for immediate updates.
- Use `scheduleWidget` for timeline-based or scheduled widget updates. This is the correct Voltra API for predictable future widget content changes on iOS.
- Use `Voltra.Image` for widget images. Bundled assets and preloaded image keys are both referenced through `assetName`.
- Use `reloadWidgets` after changing shared resources such as preloaded images.
- Use `getActiveWidgets` to inspect installed widget instances.

Plugin reminder:

- iOS widget registration is configured in the Voltra plugin under `widgets`.
- `supportedFamilies` controls the sizes exposed in the widget gallery.
- If registration or family support changes are part of the task, also read `app-config.md`.

Hosted docs: see `source-of-truth.md`.
