package voltra.widget.server

/**
 * The unit everything server-driven is keyed by: settings, fetched props, the stored ETag, fetch
 * coalescing, and the settings revision.
 *
 * Today the only case is a whole widget id. Per-instance server updates (ADR 0002, "Instance-ready")
 * add an `Instance` case above it without changing a single caller, which is the reason this is a
 * type rather than a bare `String`.
 */
sealed class WidgetScope {
    /** Widget id this scope belongs to. An instance scope will report the id it is an instance of. */
    abstract val widgetId: String

    /**
     * Stable, filesystem- and preference-safe key for per-scope storage. An instance scope will
     * append its placement key, so widget-scoped records written today keep their keys.
     */
    abstract val storageKey: String

    data class Widget(
        override val widgetId: String,
    ) : WidgetScope() {
        override val storageKey: String
            get() = widgetId
    }

    companion object {
        /** Convenience for the common case, so callers do not spell out the case name. */
        fun of(widgetId: String): WidgetScope = Widget(widgetId)
    }
}
