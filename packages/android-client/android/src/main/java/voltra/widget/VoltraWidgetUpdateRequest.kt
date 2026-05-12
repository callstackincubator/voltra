package voltra.widget

import android.content.Context
import android.content.res.Configuration
import android.net.Uri
import java.net.URL

object VoltraWidgetUpdateRequest {
    fun currentTheme(context: Context): String {
        val nightModeFlags = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        return if (nightModeFlags == Configuration.UI_MODE_NIGHT_YES) "dark" else "light"
    }

    fun buildUrl(
        serverUrl: String,
        widgetId: String,
        context: Context,
    ): URL {
        val uri =
            Uri
                .parse(serverUrl)
                .buildUpon()
                .appendQueryParameter("widgetId", widgetId)
                .appendQueryParameter("platform", "android")
                .appendQueryParameter("theme", currentTheme(context))
                .build()

        return URL(uri.toString())
    }
}
