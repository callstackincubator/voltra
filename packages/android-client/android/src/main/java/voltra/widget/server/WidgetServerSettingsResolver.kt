package voltra.widget.server

/**
 * The only way to read server-update settings.
 *
 * Layers are walked lowest to highest and merged by the rule stated once here: `headers` and
 * `query` merge per key, everything else takes the value from the highest layer that sets it.
 * Adding a layer later — an instance layer above `widget`, say — is a new
 * [WidgetServerSettingsLayer] plus one entry in [layers]; this API and every caller stay as they
 * are.
 *
 * @param layers lowest priority first: config, credentials, global, widget.
 */
class WidgetServerSettingsResolver(
    private val layers: List<WidgetServerSettingsLayer>,
    private val revisionSource: suspend () -> Long,
) {
    /**
     * Flattens every layer for [scope]. Safe to call for any widget: a widget that is not
     * server-driven resolves to disabled with no URL, so a caller that fetches on [
     * ResolvedWidgetServerSettings.shouldFetch] does nothing rather than guessing.
     */
    suspend fun resolve(scope: WidgetScope): ResolvedWidgetServerSettings {
        var merged = WidgetServerUpdateSettings.EMPTY

        for (layer in layers) {
            val settings = layer.settings(scope) ?: continue
            merged = merge(merged, settings)
        }

        val serverDriven = isServerDriven(scope)

        return ResolvedWidgetServerSettings(
            url = if (serverDriven) merged.url?.takeIf { it.isNotBlank() } else null,
            intervalMinutes =
                WidgetServerUpdateDefaults.clampIntervalMinutes(
                    merged.intervalMinutes ?: WidgetServerUpdateDefaults.DEFAULT_INTERVAL_MINUTES,
                ),
            enabled = serverDriven && (merged.enabled ?: true),
            method = merged.method ?: WidgetServerUpdateDefaults.DEFAULT_METHOD,
            query = merged.query ?: emptyMap(),
            headers = merged.headers ?: emptyMap(),
            body = merged.body,
        )
    }

    /**
     * True when app.json marked this widget server-driven. The engine is chosen at generate time,
     * so a runtime URL cannot make a widget server-driven and `setWidgetServerUpdate` rejects
     * settings for one that is not.
     */
    suspend fun isServerDriven(scope: WidgetScope): Boolean = layers.any { it.isServerDriven(scope) }

    /**
     * Monotonic counter of settings changes. A fetcher records it before fetching and commits only
     * if it is still current, so settings changed mid-flight cannot commit a response built from
     * the old ones.
     *
     * It is one counter for the whole store rather than one per scope: a change to another widget
     * can make an in-flight fetch drop its result, and the reload that every `set` queues fetches
     * again, so the cost is one wasted request in a rare race.
     */
    suspend fun revision(
        @Suppress("UNUSED_PARAMETER") scope: WidgetScope,
    ): Long = revisionSource()

    private fun merge(
        lower: WidgetServerUpdateSettings,
        higher: WidgetServerUpdateSettings,
    ): WidgetServerUpdateSettings =
        WidgetServerUpdateSettings(
            url = higher.url ?: lower.url,
            intervalMinutes = higher.intervalMinutes ?: lower.intervalMinutes,
            enabled = higher.enabled ?: lower.enabled,
            method = higher.method ?: lower.method,
            query = mergePerKey(lower.query, higher.query),
            headers = mergePerKey(lower.headers, higher.headers),
            body = higher.body ?: lower.body,
        )

    private fun mergePerKey(
        lower: Map<String, String>?,
        higher: Map<String, String>?,
    ): Map<String, String>? {
        if (lower == null) return higher
        if (higher == null) return lower
        return lower + higher
    }
}
