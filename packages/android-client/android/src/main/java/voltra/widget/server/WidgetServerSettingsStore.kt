package voltra.widget.server

import android.content.Context
import android.util.Log
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map

/**
 * The only way to write server-update settings, and the storage behind the three runtime layers.
 *
 * Records live in the same Tink-encrypted DataStore the widget credentials have always used, so
 * nothing migrates: the deprecated `setWidgetServerCredentials` keeps writing the accounts it
 * always did, and this store adds its own keys alongside them.
 *
 * Callers do not read through this class. They read through [WidgetServerSettingsResolver], which
 * is what keeps the layer order and the merge rule in one place.
 */
class WidgetServerSettingsStore(
    private val context: Context,
) {
    /** Replaces the global layer, or one widget's layer when [scope] is given. */
    suspend fun set(
        settings: WidgetServerUpdateSettings,
        scope: WidgetScope?,
    ) {
        val encoded = WidgetServerSettingsCodec.encode(settings)
        val encrypted =
            VoltraCryptoManager.encrypt(context, encoded)
                ?: throw IllegalStateException("Failed to encrypt widget server settings")

        context.voltraCredentialsDataStore.edit { prefs ->
            if (scope == null) {
                prefs[KEY_GLOBAL] = encrypted
            } else {
                prefs[widgetKey(scope)] = encrypted
                prefs[KEY_WIDGET_SCOPES] = (prefs[KEY_WIDGET_SCOPES] ?: emptySet()) + scope.storageKey
            }

            prefs[KEY_REVISION] = (prefs[KEY_REVISION] ?: 0L) + 1L
        }
    }

    /** Empties the global layer, or one widget's layer when [scope] is given. */
    suspend fun clear(scope: WidgetScope?) {
        context.voltraCredentialsDataStore.edit { prefs ->
            if (scope == null) {
                prefs.remove(KEY_GLOBAL)
            } else {
                prefs.remove(widgetKey(scope))
                prefs[KEY_WIDGET_SCOPES] = (prefs[KEY_WIDGET_SCOPES] ?: emptySet()) - scope.storageKey
            }

            prefs[KEY_REVISION] = (prefs[KEY_REVISION] ?: 0L) + 1L
        }
    }

    /**
     * Bumps the revision without changing a layer. The credentials layer writes through the
     * deprecated credential API, which does not go through [set], so it calls this to make sure an
     * in-flight fetch built with the old token does not commit.
     */
    suspend fun bumpRevision() {
        context.voltraCredentialsDataStore.edit { prefs ->
            prefs[KEY_REVISION] = (prefs[KEY_REVISION] ?: 0L) + 1L
        }
    }

    suspend fun revision(): Long =
        try {
            context.voltraCredentialsDataStore.data
                .map { prefs -> prefs[KEY_REVISION] ?: 0L }
                .first()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read settings revision: ${e.message}", e)
            0L
        }

    /** Widget ids that currently have a widget-scoped layer, so `clear` can find them. */
    suspend fun scopedStorageKeys(): Set<String> =
        try {
            context.voltraCredentialsDataStore.data
                .map { prefs -> prefs[KEY_WIDGET_SCOPES] ?: emptySet() }
                .firstOrNull() ?: emptySet()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read scoped settings keys: ${e.message}", e)
            emptySet()
        }

    internal suspend fun read(
        key: androidx.datastore.preferences.core.Preferences.Key<String>,
    ): WidgetServerUpdateSettings? =
        try {
            val encrypted =
                context.voltraCredentialsDataStore.data
                    .map { prefs -> prefs[key] }
                    .firstOrNull() ?: return null

            WidgetServerSettingsCodec.decode(VoltraCryptoManager.decrypt(context, encrypted))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read widget server settings: ${e.message}", e)
            null
        }

    internal fun widgetKey(scope: WidgetScope) = stringPreferencesKey("$KEY_WIDGET_PREFIX${scope.storageKey}")

    companion object {
        private const val TAG = "VoltraWidgetServerStore"
        private const val KEY_WIDGET_PREFIX = "server_update_widget_"

        internal val KEY_GLOBAL = stringPreferencesKey("server_update_global")
        internal val KEY_WIDGET_SCOPES = stringSetPreferencesKey("server_update_widget_keys")
        internal val KEY_REVISION = longPreferencesKey("server_update_revision")
    }
}

/** Settings the app set for every server-driven widget. */
class GlobalWidgetServerSettingsLayer(
    private val store: WidgetServerSettingsStore,
) : WidgetServerSettingsLayer {
    override val name: String = "global"

    override suspend fun settings(scope: WidgetScope): WidgetServerUpdateSettings? =
        store.read(WidgetServerSettingsStore.KEY_GLOBAL)
}

/** Settings the app set for one widget. Highest layer until instance scopes arrive. */
class WidgetWidgetServerSettingsLayer(
    private val store: WidgetServerSettingsStore,
) : WidgetServerSettingsLayer {
    override val name: String = "widget"

    override suspend fun settings(scope: WidgetScope): WidgetServerUpdateSettings? = store.read(store.widgetKey(scope))
}
