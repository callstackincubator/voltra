package voltra.widget

/**
 * The two widget engines Voltra supports, per ADR 0000. A receiver declares its kind through
 * [VoltraWidgetReceiver.widgetKind] rather than the native layer inferring it from concrete
 * Glance widget classes (`is VoltraGlanceWidget` / `is VoltraClientGlanceWidget`), so this file
 * must not import either kind-specific package.
 */
enum class VoltraWidgetKind {
    /**
     * The original engine: JSX is rendered off-device to a compressed multi-variant payload,
     * persisted in SharedPreferences, and drawn by [VoltraGlanceWidget] or a direct RemoteViews
     * path. `updateAndroidWidget` and the optional server refresh drive this kind.
     */
    Payload,

    /**
     * Dynamic Widgets (`entry` in the widget config): the widget's JS module is bundled with the
     * app and evaluated on-device on every Glance composition. `updateAndroidDynamicWidget`
     * drives this kind by sending only props.
     */
    Dynamic,
}
