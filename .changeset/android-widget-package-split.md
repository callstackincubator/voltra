---
'@use-voltra/android-client': minor
---

Android widget internals are now split into two packages by engine (ADR 0000): payload-driven
widgets live under `voltra.widget.payload` (`VoltraPayloadWidgetReceiver`, `VoltraGlanceWidget`,
`VoltraWidgetManager`, and friends), and Dynamic Widgets live under `voltra.dynamicwidget`
(`VoltraClientWidgetReceiver`, `VoltraClientGlanceWidget`, `VoltraJSRenderer`,
`VoltraConfigurationStore`, and friends). Generated widget receivers now reference these new base
classes, so projects must re-run `voltra apply` or `expo prebuild` after upgrading to regenerate
them.

The WorkManager worker (`voltra.widget.VoltraWidgetUpdateWorker`) and the Glance refresh action
(`voltra.widget.VoltraRefreshActionCallback`) keep their existing fully qualified class names, so
already-installed widgets' background refresh and refresh buttons keep working across the upgrade.

This is a breaking change for any project that imports the Kotlin widget classes directly (rather
than through the generated receivers and the public `Voltra`/`VoltraModule` API) — those imports
must be updated to the new packages.

The `voltra.runtime` package is removed: `VoltraJSRenderer` and `VoltraConfigurationStore` now
live under `voltra.dynamicwidget`, and the native renderer's JNI exports were renamed to match.
Those symbols are private to the bundled `libvoltra_js_renderer.so` and are not part of any
supported integration, so no supported usage is affected.

`voltra.glance.RemoteViewsGenerator` moved to `voltra.widget.payload.RemoteViewsGenerator`, since
it is used only by the payload engine.

`VoltraWidgetReceiver.widgetKind` and `createGlanceAppWidget()` are now abstract instead of
defaulting to the payload-driven behavior, so any hand-written receiver extending
`voltra.widget.VoltraWidgetReceiver` directly must now extend
`voltra.widget.payload.VoltraPayloadWidgetReceiver` or `voltra.dynamicwidget.VoltraClientWidgetReceiver`
instead.

Cross-kind reloads (clear all, reload all, colour-scheme re-render) now classify each installed
widget through the kind resolver instead of assuming a widget id is Dynamic "by subtraction". A
widget whose receiver cannot be resolved is logged and skipped rather than treated as Dynamic.
Reload-all also now classifies cached/server-driven ids through the resolver instead of assuming
every one of them is payload-driven: an id that still has a stale cached payload but resolves as a
Dynamic Widget has that stale payload purged and is reloaded through the Dynamic path instead of
having the stale payload pushed onto it.
