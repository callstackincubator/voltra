package voltra.widget.server

/**
 * The unit everything server-driven is keyed by: settings, fetched props, the stored ETag, fetch
 * coalescing, and the settings revision.
 *
 * [Widget] is a whole widget id. [Instance] (ADR 0007) is one distinct merged configuration of a
 * widget: two placements with identical configuration share one key, one fetch, one ETag and one
 * props slot. The settings resolver, ETag store, status store, runner and request builder take
 * either case with no signature change; the settings layers keep resolving by widget id, so an
 * instance inherits the widget's URL, interval, method, headers and body.
 */
sealed class WidgetScope {
    /** Widget id this scope belongs to. An instance scope reports the id it is an instance of. */
    abstract val widgetId: String

    /**
     * Stable, filesystem- and preference-safe key for per-scope storage. An instance scope appends
     * its placement key, so widget-scoped records written today keep their keys.
     */
    abstract val storageKey: String

    data class Widget(
        override val widgetId: String,
    ) : WidgetScope() {
        override val storageKey: String
            get() = widgetId
    }

    /**
     * One distinct merged configuration of [widgetId]. [key] is the hash of that configuration's
     * canonical serialization (see [WidgetCanonicalConfiguration]) — opaque, stable, and produced
     * identically on iOS for the same configuration.
     */
    data class Instance(
        override val widgetId: String,
        val key: String,
    ) : WidgetScope() {
        override val storageKey: String
            get() = "$widgetId#$key"
    }

    companion object {
        /** Convenience for the common case, so callers do not spell out the case name. */
        fun of(widgetId: String): WidgetScope = Widget(widgetId)

        /**
         * The scope for one placement's merged [configuration]: [Instance] when the configuration
         * is non-empty, [Widget] when it is — a widget with no configuration parameters has exactly
         * one instance, the widget scope, and its requests and storage are unchanged by ADR 0007.
         */
        fun of(
            widgetId: String,
            configuration: Map<String, String>,
        ): WidgetScope =
            WidgetCanonicalConfiguration.key(configuration)?.let { Instance(widgetId, it) } ?: Widget(widgetId)
    }
}
