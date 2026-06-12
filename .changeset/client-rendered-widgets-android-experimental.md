---
'@use-voltra/android-client': minor
---

**Experimental: client-rendered widgets (Android).** A widget component marked with the
`'use voltra'` directive now renders on-device in a standalone Hermes runtime, called as
`(props, env) => JSX` on every render, so it reacts to live environment values (widget size, color
scheme, Material You colors, locale, and configuration). In development the bundle is served by
Metro and editing the JSX hot-reloads the pinned widget; in release builds the bundle is baked into
the app's assets at build time.

Configuration parameters declared in `app.json` (`appIntent.parameters`, with code-defined
defaults) surface as `env.configuration`; runtime values set via `setWidgetConfiguration` override
the defaults (Android has no system widget-configuration UI, so this is an in-app stand-in).

This feature is **experimental** — usable in production at your own risk; the API and generated
build output may change. Verify release rendering on a real device (emulators are unreliable for
widget rendering).
