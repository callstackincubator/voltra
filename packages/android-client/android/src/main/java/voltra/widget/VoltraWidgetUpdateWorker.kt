package voltra.widget

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import voltra.widget.payload.PayloadWidgetUpdateWorker

/**
 * Pinned at this fully qualified name (ADR 0000): WorkManager persists a scheduled worker's class
 * name in its own on-device database and recreates the worker reflectively by that name on every
 * run, including after process death and app updates. Renaming or moving this class would leave
 * every already-scheduled periodic or one-time widget-update job unable to find its worker class,
 * silently breaking in-flight background refreshes for already-installed widgets until the work
 * is cancelled and re-scheduled (e.g. by removing and re-adding the widget). See ADR 0000 for the
 * full rationale. The real update logic lives in [PayloadWidgetUpdateWorker]; this class only
 * delegates to it, so package moves of the payload engine never touch this name.
 */
class VoltraWidgetUpdateWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    companion object {
        const val TAG = "VoltraWidgetUpdateWorker"
        const val KEY_WIDGET_ID = "widget_id"
        const val KEY_SERVER_URL = "server_url"
        const val WORK_NAME_PREFIX = "voltra_widget_update_"

        /** Stop retrying after this many consecutive failures to avoid infinite retry loops. */
        const val MAX_RETRIES = 3
    }

    override suspend fun doWork(): Result =
        PayloadWidgetUpdateWorker.performUpdate(applicationContext, inputData, runAttemptCount)
}
