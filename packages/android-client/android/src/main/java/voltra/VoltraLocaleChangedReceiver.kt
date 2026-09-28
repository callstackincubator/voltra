package voltra

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Re-renders every placed Dynamic Widget when the device locale, the app's per-app locale or the
 * regional preferences change (ADR 0009 §2).
 *
 * The launcher keeps re-applying the last RemoteViews, in which Glance has already baked literal
 * strings, and the system does not re-broadcast `APPWIDGET_UPDATE` on a locale change. Declared in
 * the library manifest: `ACTION_LOCALE_CHANGED` is on the implicit-broadcast exception list, so it
 * reaches this receiver even when the app process is not running.
 */
class VoltraLocaleChangedReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        if (intent.action != Intent.ACTION_LOCALE_CHANGED) return

        Log.d(TAG, "Locale changed; reloading Dynamic Widgets")
        val pendingResult = goAsync()
        val appContext = context.applicationContext
        CoroutineScope(Dispatchers.Default).launch {
            try {
                WidgetOrchestrator(appContext).reloadClientWidgets()
            } catch (e: Exception) {
                Log.e(TAG, "Locale-change reload failed: ${e.message}")
            } finally {
                pendingResult.finish()
            }
        }
    }

    private companion object {
        const val TAG = "VoltraLocaleChanged"
    }
}
