package voltra.dynamicwidget.serverupdate

import android.content.Context
import android.os.Build
import android.util.Log
import androidx.concurrent.futures.await
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequest
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerUpdateDefaults
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * WorkManager scheduling for server-driven Dynamic Widgets.
 *
 * Its own worker class and its own unique work names, deliberately: the payload engine's work is
 * pinned on devices by class name, and reusing it would mean one release could hand a Dynamic
 * Widget's job to a worker that writes payloads.
 */
object DynamicWidgetServerUpdateScheduler {
    private const val TAG = "VoltraDynamicServerSched"

    internal const val WORK_NAME_PREFIX = "voltra_dynamic_widget_server_"
    internal const val WORK_TAG = "voltra_dynamic_widget_server_update"
    internal const val KEY_WIDGET_ID = "widgetId"
    internal const val KEY_INSTANCE_KEY = "instanceKey"

    private const val BACKOFF_SECONDS = 30L

    /**
     * Serializes every change to a scope's work and to the schedule index. Without it, a
     * [recompute] that read the index before a worker's [cancel] could write the cancelled scope
     * back, and a later re-enable would then skip its immediate fetch. Not reentrant: functions
     * called while it is held use the `Locked` variants.
     */
    private val lock = Mutex()

    /**
     * When (in [System.nanoTime]) the last one-time fetch of each scope, by storage key, finished.
     * Written by [restartPeriodicAfterFetch] before the fetching run returns, so a periodic run
     * that sees that fetch as finished also sees this. See [waitsForPendingFetch].
     */
    private val lastFetchFinishedAt = ConcurrentHashMap<String, Long>()

    /**
     * A periodic run that starts this soon after a fetch finished is a duplicate of it. A periodic
     * request re-enqueued by [restartPeriodicAfterFetch] first runs one interval later, and
     * intervals are at least [WidgetServerUpdateDefaults.MIN_INTERVAL_MINUTES] (15), so a minute
     * only covers a run that was dispatched before the fetch finished and reaches its check after.
     */
    private val duplicateRunWindowNanos = TimeUnit.MINUTES.toNanos(1)

    /**
     * Schedules — or reschedules — periodic fetches from the widget's resolved interval, and runs
     * one now so a freshly placed widget does not sit on its placeholder for 15 minutes.
     *
     * Cancels instead when the widget has nothing to fetch, which is what makes
     * `setWidgetServerUpdate({ enabled: false })` actually stop the work rather than just ignore
     * its results.
     *
     * @return whether periodic fetches are now scheduled for [scope]; false when it was cancelled.
     */
    private suspend fun scheduleLocked(
        context: Context,
        scope: WidgetScope,
        runImmediately: Boolean,
    ): Boolean {
        val settings = VoltraWidgetServer.resolver(context).resolve(scope)

        if (!settings.shouldFetch) {
            cancelLocked(context, scope)
            Log.d(TAG, "Not scheduling '${scope.widgetId}': no url, or fetching is disabled")
            return false
        }

        // Every periodic request waits one interval before its first run, so the immediate run below
        // is not followed by a second fetch at once. Initial delay:
        // https://developer.android.com/reference/androidx/work/PeriodicWorkRequest.Builder
        enqueuePeriodic(context, scope, settings.intervalMinutes)

        if (runImmediately) {
            requestImmediateUpdate(context, scope)
        }

        return true
    }

    /**
     * Recomputes the set of scopes to schedule for [widgetId] from its current placements (ADR
     * 0007): one scope per distinct merged configuration. New keys are scheduled (and run
     * immediately, since their placement has never fetched); keys with no placement left are
     * cancelled. A scope with nothing to fetch is cancelled and kept out of the schedule index, so
     * when fetching comes back it counts as new and runs immediately, next to its delayed periodic
     * request. Called on `onUpdate`, `onDeleted`, an instance configuration write or clear, a
     * type-level configuration write, and a settings change — every event that can move a
     * placement between configurations.
     *
     * [fetchNow] also runs an immediate fetch for every scope that stays scheduled. A settings
     * change passes it, because a new url, token or interval must not wait out the old periodic
     * delay: a fetch that was in flight with the old settings is dropped by the runner and
     * replaced here.
     *
     * A widget with no configuration parameters always resolves to the single [WidgetScope.Widget]
     * scope, so this reduces to today's one-scope-per-widget behaviour for it.
     */
    suspend fun recompute(
        context: Context,
        widgetId: String,
        fetchNow: Boolean = false,
    ) = lock.withLock {
        val currentScopes = DynamicWidgetInstanceScopes.scopes(context, widgetId)
        val currentStorageKeys = currentScopes.map { it.storageKey }.toSet()
        val previousStorageKeys = DynamicWidgetScheduleIndex.storageKeys(context, widgetId)

        // A release before ADR 0007 scheduled every widget under its plain widget scope and kept no
        // index, so that name is treated as always previously scheduled: it is cancelled here
        // unless the widget still resolves to the widget scope (no configuration parameters).
        val legacyStorageKey = WidgetScope.of(widgetId).storageKey
        val orphaned = (previousStorageKeys + legacyStorageKey) - currentStorageKeys
        orphaned.forEach { storageKey -> cancelStorageKey(context, storageKey) }

        val scheduledStorageKeys =
            currentScopes
                .filter { scope ->
                    scheduleLocked(
                        context,
                        scope,
                        runImmediately = fetchNow || scope.storageKey !in previousStorageKeys,
                    )
                }.map { it.storageKey }
                .toSet()

        DynamicWidgetScheduleIndex.put(context, widgetId, scheduledStorageKeys)
    }

    /**
     * Moves the periodic schedule to what the server asked for with `Cache-Control: max-age`,
     * without re-resolving settings or running a fetch.
     */
    suspend fun reschedule(
        context: Context,
        scope: WidgetScope,
        intervalMinutes: Long,
    ) {
        lock.withLock {
            enqueuePeriodic(context, scope, intervalMinutes)
        }
        Log.d(TAG, "Server asked '${scope.widgetId}' to come back in ${intervalMinutes}min")
    }

    /**
     * Called when a one-time fetch for [scope] has finished (committed, dropped or failed). Notes
     * the finish time for [waitsForPendingFetch], then, if the periodic request is still waiting,
     * re-enqueues it so its first run falls one interval after this fetch, not after the placement
     * that was offline. A periodic request that is already running is left alone, so an in-flight
     * fetch is never cancelled; [waitsForPendingFetch] stops it if it has not fetched yet.
     *
     * @param intervalMinutes the `max-age` the server returned, or null to use the resolved interval.
     */
    suspend fun restartPeriodicAfterFetch(
        context: Context,
        scope: WidgetScope,
        intervalMinutes: Long?,
    ) {
        lock.withLock {
            lastFetchFinishedAt[scope.storageKey] = System.nanoTime()
            val waiting =
                WorkManager
                    .getInstance(context)
                    .getWorkInfosForUniqueWork(workName(scope))
                    .await()
                    .any { it.state == WorkInfo.State.ENQUEUED }
            if (waiting) {
                val settings = VoltraWidgetServer.resolver(context).resolve(scope)
                if (settings.shouldFetch) {
                    WorkManager
                        .getInstance(context)
                        .enqueueUniquePeriodicWork(
                            workName(scope),
                            ExistingPeriodicWorkPolicy.CANCEL_AND_REENQUEUE,
                            buildPeriodicRequest(scope, intervalMinutes ?: settings.intervalMinutes),
                        )
                } else {
                    cancelLocked(context, scope)
                }
            }
        }
    }

    /**
     * Whether a periodic run for [scope] should stop without fetching, because this widget's
     * one-time fetch (placement, refresh or settings change, retries included) either has not
     * finished or has just finished. The run that is that one-time fetch is never held back.
     *
     * Both requests have the same network constraint, so an offline placement can make them due
     * together after reconnecting. The "just finished" half is for the periodic run that
     * [restartPeriodicAfterFetch] found already running and so could not re-enqueue: it reaches
     * this check after the one-time fetch is done, and would otherwise fetch again.
     */
    suspend fun waitsForPendingFetch(
        context: Context,
        scope: WidgetScope,
        runId: UUID,
    ): Boolean {
        val infos =
            WorkManager
                .getInstance(context)
                .getWorkInfosForUniqueWork(oneTimeWorkName(scope))
                .await()
        if (infos.any { it.id == runId }) return false
        if (infos.any { !it.state.isFinished }) return true
        val finishedAt = lastFetchFinishedAt[scope.storageKey] ?: return false
        return System.nanoTime() - finishedAt < duplicateRunWindowNanos
    }

    private fun enqueuePeriodic(
        context: Context,
        scope: WidgetScope,
        intervalMinutes: Long,
    ) {
        WorkManager
            .getInstance(context)
            .enqueueUniquePeriodicWork(
                workName(scope),
                ExistingPeriodicWorkPolicy.UPDATE,
                buildPeriodicRequest(scope, intervalMinutes),
            )

        Log.d(TAG, "Scheduled server updates for '${scope.widgetId}' every ${intervalMinutes}min")
    }

    /**
     * The periodic request [enqueuePeriodic] sends, built separately so a test can read back its
     * initial delay.
     *
     * The first run waits one interval, whichever path enqueues the request. While `periodCount` is
     * 0, WorkManager's next run is `lastEnqueueTime + initialDelay` (work-runtime 2.9.1,
     * `androidx/work/impl/model/WorkSpec.kt:512-516`), and an UPDATE keeps the old
     * `lastEnqueueTime` and `periodCount` (`androidx/work/impl/WorkerUpdater.kt:64-67`). A zero
     * delay on a request that has not run yet would therefore be due at once. Sources:
     * https://dl.google.com/dl/android/maven2/androidx/work/work-runtime/2.9.1/work-runtime-2.9.1-sources.jar
     * and https://developer.android.com/reference/androidx/work/PeriodicWorkRequest.Builder
     */
    internal fun buildPeriodicRequest(
        scope: WidgetScope,
        intervalMinutes: Long,
    ): PeriodicWorkRequest =
        PeriodicWorkRequestBuilder<DynamicWidgetServerUpdateWorker>(
            intervalMinutes,
            TimeUnit.MINUTES,
        ).setInitialDelay(intervalMinutes, TimeUnit.MINUTES)
            .setInputData(inputData(scope))
            .setConstraints(networkConstraints())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, BACKOFF_SECONDS, TimeUnit.SECONDS)
            .addTag(WORK_TAG)
            .build()

    /**
     * Runs a fetch as soon as the device allows. Used by the refresh button, by
     * `reloadAndroidWidgets`, and by every settings change, none of which should wait out the
     * remainder of a 15 minute period.
     */
    fun requestImmediateUpdate(
        context: Context,
        scope: WidgetScope,
    ) {
        enqueueOneTime(context, scope, delayMinutes = 0L, expedited = true)
    }

    /**
     * Runs a fetch after the delay the server asked for with `Retry-After`. Used instead of
     * WorkManager's own backoff, which starts at 30 seconds and would ignore what the server said.
     */
    fun requestDelayedUpdate(
        context: Context,
        scope: WidgetScope,
        delayMinutes: Long,
    ) {
        enqueueOneTime(context, scope, delayMinutes = delayMinutes, expedited = false)
    }

    private fun enqueueOneTime(
        context: Context,
        scope: WidgetScope,
        delayMinutes: Long,
        expedited: Boolean,
    ) {
        // Unique per scope, so a settings change plus a reload plus a refresh tap collapse into
        // one fetch rather than three. REPLACE rather than KEEP because the newest request is the
        // one carrying the caller's intent -- a fresh URL, or a delay the server asked for.
        WorkManager
            .getInstance(context)
            .enqueueUniqueWork(
                oneTimeWorkName(scope),
                ExistingWorkPolicy.REPLACE,
                buildOneTimeRequest(scope, delayMinutes, expedited),
            )
    }

    /**
     * The one-time request [enqueueOneTime] sends, built separately so a test can read back whether
     * it actually asked for expedited work on the SDK level it is running at. Testing the decision
     * alone would pass with the `setExpedited` call below reverted.
     */
    internal fun buildOneTimeRequest(
        scope: WidgetScope,
        delayMinutes: Long,
        expedited: Boolean,
    ): OneTimeWorkRequest {
        val builder =
            OneTimeWorkRequestBuilder<DynamicWidgetServerUpdateWorker>()
                .setInputData(inputData(scope))
                .setConstraints(networkConstraints())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, BACKOFF_SECONDS, TimeUnit.SECONDS)
                .addTag(WORK_TAG)

        if (delayMinutes > 0) {
            builder.setInitialDelay(delayMinutes, TimeUnit.MINUTES)
        } else if (shouldRunExpedited(expedited, Build.VERSION.SDK_INT)) {
            builder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
        }

        return builder.build()
    }

    /** Cancels [scope]'s work and forgets it in the schedule index, so a later schedule runs at once. */
    suspend fun cancel(
        context: Context,
        scope: WidgetScope,
    ) {
        lock.withLock {
            cancelLocked(context, scope)
        }
    }

    private fun cancelLocked(
        context: Context,
        scope: WidgetScope,
    ) {
        cancelStorageKey(context, scope.storageKey)
        DynamicWidgetScheduleIndex.remove(context, scope.widgetId, scope.storageKey)
    }

    /** Cancels by raw storage key, for a scope [recompute] found no placement for any more. */
    private fun cancelStorageKey(
        context: Context,
        storageKey: String,
    ) {
        lastFetchFinishedAt.remove(storageKey)
        WorkManager.getInstance(context).cancelUniqueWork(workNameForStorageKey(storageKey))
        WorkManager.getInstance(context).cancelUniqueWork(oneTimeWorkNameForStorageKey(storageKey))
    }

    /**
     * Cancels every scope currently scheduled for [widgetId], including ones no longer derivable
     * from its placements. Used when a widget is removed entirely (`onDeleted` with none left) and
     * by logout, neither of which can recompute a scope set from placements that are already gone.
     */
    suspend fun cancelAll(
        context: Context,
        widgetId: String,
    ) {
        lock.withLock {
            DynamicWidgetScheduleIndex.storageKeys(context, widgetId).forEach { storageKey ->
                cancelStorageKey(context, storageKey)
            }
            DynamicWidgetScheduleIndex.put(context, widgetId, emptySet())
        }
    }

    /**
     * On API 30 and below, WorkManager runs expedited work as a foreground service and calls
     * `CoroutineWorker.getForegroundInfo()`, which [DynamicWidgetServerUpdateWorker] does not
     * override; the default implementation throws `IllegalStateException`, crashing the process
     * within a second of any "refresh now" request. Android 12 (API 31, `Build.VERSION_CODES.S`)
     * added the "quick, transient" expedited path that no longer requires a foreground service, so
     * expedited scheduling is only safe from there on. Below that, the request still runs, just as
     * ordinary (non-expedited) one-time work.
     */
    internal fun shouldRunExpedited(
        requestedExpedited: Boolean,
        sdkInt: Int,
    ): Boolean = requestedExpedited && sdkInt >= Build.VERSION_CODES.S

    internal fun workName(scope: WidgetScope): String = workNameForStorageKey(scope.storageKey)

    private fun oneTimeWorkName(scope: WidgetScope): String = oneTimeWorkNameForStorageKey(scope.storageKey)

    private fun workNameForStorageKey(storageKey: String): String = "$WORK_NAME_PREFIX$storageKey"

    private fun oneTimeWorkNameForStorageKey(storageKey: String): String = "$WORK_NAME_PREFIX${storageKey}_once"

    private fun inputData(scope: WidgetScope): Data =
        Data
            .Builder()
            .putString(KEY_WIDGET_ID, scope.widgetId)
            .apply {
                if (scope is WidgetScope.Instance) {
                    putString(KEY_INSTANCE_KEY, scope.key)
                }
            }.build()

    private fun networkConstraints(): Constraints =
        Constraints
            .Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
}

/**
 * Remembers which [WidgetScope.storageKey]s are currently scheduled for each widget id, so
 * [DynamicWidgetServerUpdateScheduler.recompute] can tell which keys are new (schedule + run now)
 * and which have no placement left (cancel) by comparing against this record. Holds only keys
 * whose periodic work is scheduled: a cancelled scope is removed, so scheduling it again counts as
 * new.
 */
private object DynamicWidgetScheduleIndex {
    private const val PREFERENCES_NAME = "voltra_dynamic_widget_server_schedule"
    private const val KEY_PREFIX = "scheduled_keys."

    fun storageKeys(
        context: Context,
        widgetId: String,
    ): Set<String> {
        val raw = preferences(context).getStringSet(KEY_PREFIX + widgetId, null)
        return raw?.toSet() ?: emptySet()
    }

    fun put(
        context: Context,
        widgetId: String,
        storageKeys: Set<String>,
    ) {
        preferences(context)
            .edit()
            .apply {
                if (storageKeys.isEmpty()) {
                    remove(KEY_PREFIX + widgetId)
                } else {
                    putStringSet(KEY_PREFIX + widgetId, storageKeys)
                }
            }.apply()
    }

    fun remove(
        context: Context,
        widgetId: String,
        storageKey: String,
    ) {
        put(context, widgetId, storageKeys(context, widgetId) - storageKey)
    }

    private fun preferences(context: Context) =
        context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
}
