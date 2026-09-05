package voltra.widget.server

import android.content.Context
import android.content.pm.ApplicationInfo

/**
 * Assembles the settings stack for the process.
 *
 * Everything that needs server-update settings goes through here: the payload worker, the payload
 * refresh button, the Dynamic Widget worker, and the bridge methods. Neither engine reads the
 * generated asset, the DataStore, or the credential records on its own, which is what keeps the
 * layer order and the merge rule in one place.
 */
object VoltraWidgetServer {
    @Volatile
    private var resolverCache: WidgetServerSettingsResolver? = null

    @Volatile
    private var storeCache: WidgetServerSettingsStore? = null

    @Volatile
    private var defaultsCache: WidgetServerDefaultsStore? = null

    fun resolver(context: Context): WidgetServerSettingsResolver {
        resolverCache?.let { return it }

        synchronized(this) {
            resolverCache?.let { return it }

            val applicationContext = context.applicationContext
            val store = store(applicationContext)

            // Fixed order, lowest priority first. An instance layer will slot in above `widget`.
            val resolver =
                WidgetServerSettingsResolver(
                    layers =
                        listOf(
                            ConfigWidgetServerSettingsLayer(defaults(applicationContext)),
                            CredentialsWidgetServerSettingsLayer(applicationContext),
                            GlobalWidgetServerSettingsLayer(store),
                            WidgetWidgetServerSettingsLayer(store),
                        ),
                    revisionSource = { store.revision() },
                )

            resolverCache = resolver
            return resolver
        }
    }

    fun store(context: Context): WidgetServerSettingsStore {
        storeCache?.let { return it }

        synchronized(this) {
            storeCache?.let { return it }

            return WidgetServerSettingsStore(context.applicationContext).also { storeCache = it }
        }
    }

    fun defaults(context: Context): WidgetServerDefaultsStore {
        defaultsCache?.let { return it }

        synchronized(this) {
            defaultsCache?.let { return it }

            return WidgetServerDefaultsStore(context.applicationContext).also { defaultsCache = it }
        }
    }

    /** Every widget app.json marked server-driven, whichever engine renders it. */
    fun serverDrivenWidgetIds(context: Context): Set<String> = defaults(context).serverDrivenWidgetIds()

    /**
     * Whether plain http to a local dev host is allowed. Release builds block cleartext traffic, so
     * accepting such a URL there would only move the failure to fetch time.
     */
    fun isDebugBuild(context: Context): Boolean =
        (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
}
