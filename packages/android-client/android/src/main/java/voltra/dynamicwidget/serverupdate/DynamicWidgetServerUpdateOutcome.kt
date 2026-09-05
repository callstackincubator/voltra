package voltra.dynamicwidget.serverupdate

/**
 * What one server-update run decided, before it is turned into a WorkManager result.
 *
 * Splitting the decision from the plumbing is what makes the ADR 0002 failure table testable: the
 * rules for "retry", "give up", and "keep what we have" are the interesting part, and none of them
 * need WorkManager to be exercised.
 */
internal data class DynamicWidgetServerUpdateResult(
    val outcome: DynamicWidgetServerUpdateOutcome,
    /**
     * What the server asked for about the next fetch, in minutes: `Cache-Control: max-age` on a
     * success, `Retry-After` on a `429` or `503`. Already clamped to what the platform can honour.
     * Null when the server said nothing and the widget's own interval stands.
     */
    val nextIntervalMinutes: Long? = null,
)

internal enum class DynamicWidgetServerUpdateOutcome {
    /** Props were committed, or the server said `304` and what we have is still current. */
    Committed,

    /** Nothing to do: the widget has no URL, or the app turned fetching off. */
    Skipped,

    /**
     * Something went wrong that waiting could fix — no connectivity, a `5xx`, a `429`. The
     * previous props stay on screen and the run is retried with backoff.
     */
    Retry,

    /**
     * Something went wrong that waiting will not fix — a `401`, a `404`, a body that is not props.
     * The previous props stay on screen and the next periodic run tries again at the normal
     * interval rather than immediately.
     */
    Failed,

    /**
     * The response arrived and parsed, but the settings it was built from are no longer current.
     * The result is dropped; the reload queued by whatever changed the settings fetches again.
     */
    Dropped,
}
