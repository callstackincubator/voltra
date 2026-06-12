---
'@use-voltra/ios-client': minor
---

**Experimental: client-rendered widgets (iOS).** A widget component marked with the `'use voltra'`
directive now renders on-device from its own JS bundle, called as `(props, env) => JSX` on every
render, so it reacts to live environment values (widget family, color scheme, locale, and
user-editable `configuration` via a native AppIntent "Edit Widget" sheet). In development the
bundle is served by Metro and editing the JSX hot-reloads the home-screen widget; in release builds
the bundle is baked into the widget extension at build time.

This feature is **experimental** — usable in production at your own risk; the API and generated
build output may change. Verify release rendering on a real device (the iOS Simulator is unreliable
for widget rendering).
