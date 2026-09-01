package voltra.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import java.util.concurrent.ConcurrentHashMap

/**
 * Resolves generated widget receivers from the installed AppWidget providers.
 */
internal object VoltraWidgetReceivers {
    private const val TAG = "VoltraWidgetReceivers"
    private const val CLASS_PREFIX = "VoltraWidget_"
    private const val CLASS_SUFFIX = "Receiver"

    /**
     * Receivers resolved from the provider list, keyed by widget id.
     */
    private val resolvedReceivers = ConcurrentHashMap<String, ComponentName>()

    /** The AppWidget providers declared by this app. */
    fun installedReceivers(context: Context): List<ComponentName> =
        try {
            AppWidgetManager
                .getInstance(context)
                .installedProviders
                .map { it.provider }
                .filter { it.packageName == context.packageName }
        } catch (e: Exception) {
            Log.e(TAG, "installedProviders failed: ${e.message}", e)
            emptyList()
        }

    fun componentName(
        context: Context,
        widgetId: String,
    ): ComponentName {
        resolvedReceivers[widgetId]?.let { return it }

        val simpleName = "$CLASS_PREFIX$widgetId$CLASS_SUFFIX"
        val resolved =
            installedReceivers(context).firstOrNull {
                it.className.substringAfterLast('.') == simpleName
            }

        if (resolved != null) {
            resolvedReceivers[widgetId] = resolved
            return resolved
        }

        // fallback, only OK when the applicationId matches the namespace
        return ComponentName(context.packageName, "${context.packageName}.widget.$simpleName")
    }

    fun className(
        context: Context,
        widgetId: String,
    ): String = componentName(context, widgetId).className

    fun widgetIdOrNull(className: String): String? {
        val simpleName = className.substringAfterLast('.')
        if (!simpleName.startsWith(CLASS_PREFIX) || !simpleName.endsWith(CLASS_SUFFIX)) {
            return null
        }
        return simpleName.removePrefix(CLASS_PREFIX).removeSuffix(CLASS_SUFFIX)
    }
}
