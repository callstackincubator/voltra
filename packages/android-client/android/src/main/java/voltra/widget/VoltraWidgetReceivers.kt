package voltra.widget

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.annotation.VisibleForTesting

/**
 * Resolves the generated widget receivers declared by the host application.
 *
 * Receiver classes are generated into the app module's `namespace` package, while
 * [Context.getPackageName] returns the `applicationId`. Those differ whenever an app uses
 * product flavors or an `applicationIdSuffix`, so the class name cannot be derived from the
 * package name. It is read from the app's own declared receivers instead, which carry the
 * real class name alongside the applicationId that [ComponentName] needs.
 */
internal object VoltraWidgetReceivers {
    private const val TAG = "VoltraWidgetReceivers"
    private const val CLASS_PREFIX = "VoltraWidget_"
    private const val CLASS_SUFFIX = "Receiver"

    /**
     * Widget id to receiver component, read once per process. Receivers are declared in the
     * manifest, so the set cannot change while the process lives.
     */
    @Volatile
    private var receivers: Map<String, ComponentName>? = null

    /** Widget id encoded in a generated receiver class name, or null if it is not one. */
    fun widgetIdOrNull(className: String): String? {
        val simpleName = className.substringAfterLast('.')
        if (!simpleName.startsWith(CLASS_PREFIX) || !simpleName.endsWith(CLASS_SUFFIX)) {
            return null
        }
        val widgetId = simpleName.removePrefix(CLASS_PREFIX).removeSuffix(CLASS_SUFFIX)
        return if (widgetId.isEmpty()) null else widgetId
    }

    /** Every generated widget receiver this app declares, keyed by widget id. */
    fun installedReceivers(context: Context): Map<String, ComponentName> {
        receivers?.let { return it }
        return synchronized(this) {
            receivers ?: resolveDeclaredReceivers(context).also { receivers = it }
        }
    }

    fun componentName(
        context: Context,
        widgetId: String,
    ): ComponentName {
        installedReceivers(context)[widgetId]?.let { return it }

        // The receiver is not declared in the manifest, so there is no class name to read.
        // Fall back to the generation convention, which is correct only when the app's
        // applicationId and namespace match.
        val fallback =
            ComponentName(
                context.packageName,
                "${context.packageName}.widget.$CLASS_PREFIX$widgetId$CLASS_SUFFIX",
            )
        Log.w(TAG, "No declared receiver for widget '$widgetId'; assuming ${fallback.className}")
        return fallback
    }

    fun className(
        context: Context,
        widgetId: String,
    ): String = componentName(context, widgetId).className

    @VisibleForTesting
    fun clearCache() {
        synchronized(this) { receivers = null }
    }

    private fun resolveDeclaredReceivers(context: Context): Map<String, ComponentName> =
        try {
            val declared =
                context.packageManager
                    .getPackageInfo(context.packageName, PackageManager.GET_RECEIVERS)
                    .receivers
                    .orEmpty()
            declared
                .mapNotNull { receiver ->
                    widgetIdOrNull(receiver.name)?.let { widgetId ->
                        widgetId to ComponentName(receiver.packageName, receiver.name)
                    }
                }.toMap()
        } catch (e: Exception) {
            // Includes NameNotFoundException and TransactionTooLargeException on apps with an
            // unusually large component list. Callers fall back to the naming convention.
            Log.e(TAG, "Could not read declared receivers: ${e.message}", e)
            emptyMap()
        }
}
