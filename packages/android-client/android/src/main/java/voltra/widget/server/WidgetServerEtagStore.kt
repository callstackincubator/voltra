package voltra.widget.server

import android.content.Context

/**
 * The ETag from the last `200`, stored with the URL it came from.
 *
 * Keeping the URL alongside it is what makes `If-None-Match` safe once the app can change the URL
 * at runtime: an ETag minted by one endpoint says nothing about another, and sending it could
 * produce a `304` that leaves the widget showing the previous endpoint's data forever.
 */
class WidgetServerEtagStore(
    context: Context,
) {
    private val preferences = context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    /** The stored ETag, but only if it was minted by [url]. */
    fun etag(
        scope: WidgetScope,
        url: String?,
    ): String? {
        if (url == null) return null
        if (preferences.getString(urlKey(scope), null) != url) return null

        return preferences.getString(etagKey(scope), null)
    }

    fun put(
        scope: WidgetScope,
        url: String,
        etag: String?,
    ) {
        preferences
            .edit()
            .apply {
                if (etag == null) {
                    remove(etagKey(scope))
                    remove(urlKey(scope))
                } else {
                    putString(etagKey(scope), etag)
                    putString(urlKey(scope), url)
                }
            }.apply()
    }

    fun clear(scope: WidgetScope) {
        preferences
            .edit()
            .remove(etagKey(scope))
            .remove(urlKey(scope))
            .apply()
    }

    private fun etagKey(scope: WidgetScope) = "etag.${scope.storageKey}"

    private fun urlKey(scope: WidgetScope) = "etag_url.${scope.storageKey}"

    companion object {
        private const val PREFERENCES_NAME = "voltra_widget_server_etags"
    }
}
