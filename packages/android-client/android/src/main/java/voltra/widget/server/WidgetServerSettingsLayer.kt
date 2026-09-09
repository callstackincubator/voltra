package voltra.widget.server

/**
 * One source of server-update settings. Implementations return a partial
 * [WidgetServerUpdateSettings] or null when they have nothing to say about the scope.
 *
 * Layers are stacked in a fixed order by [WidgetServerSettingsResolver] and never consulted
 * directly: nothing outside this package reads the generated asset, the DataStore, or anything
 * else for server-update purposes.
 */
interface WidgetServerSettingsLayer {
    /** A short name used in logs, so a surprising resolved value can be traced to its source. */
    val name: String

    suspend fun settings(scope: WidgetScope): WidgetServerUpdateSettings?

    /**
     * Whether this layer knows the scope to be server-driven at all. Only the config layer can
     * answer this — a runtime layer setting a URL does not turn a locally-rendered widget into a
     * server-driven one, because the engine is chosen at generate time.
     */
    suspend fun isServerDriven(scope: WidgetScope): Boolean = false
}
