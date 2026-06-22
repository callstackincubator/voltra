---
'@use-voltra/android-client': minor
---

**Experimental: Dynamic Widgets (Android).** A widget component declared in `app.json` with a
stable `id` and a project-relative `entry` path now renders on-device in a standalone Hermes
runtime, called as `(props, env) => JSX` on every render, so it reacts to live environment values
(widget size, color scheme, locale, and configuration). Material You dynamic colors are consumed via
`AndroidDynamicColors` tokens that the native renderer resolves to the system color scheme (and that
follow light/dark automatically). In development the bundle is served by Metro and editing the JSX
hot-reloads the pinned widget; in release builds the bundle is baked into the app's assets at build
time.

Configuration parameters declared in `app.json` (`appIntent.parameters`, with code-defined
defaults) surface as `env.configuration`; runtime values set via `setWidgetConfiguration` override
the defaults (Android has no system widget-configuration UI, so this is an in-app stand-in).

This feature is **experimental** — usable in production at your own risk; the API and generated
build output may change. Release rendering has been verified on the Android emulator (the baked
bundle renders on-device with Metro stopped); confirming on a physical device is still recommended.
