package voltra

import android.appwidget.AppWidgetManager
import android.content.ComponentCallbacks
import android.content.res.Configuration
import android.util.Log
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import voltra.dynamicwidget.AndroidDynamicWidgetInstanceBoundary
import voltra.dynamicwidget.DynamicWidgetInstanceRejection
import voltra.dynamicwidget.DynamicWidgetInstanceResolver
import voltra.dynamicwidget.DynamicWidgetPropsStore
import voltra.dynamicwidget.DynamicWidgetUpdateRejection
import voltra.dynamicwidget.DynamicWidgetUpdateTrigger
import voltra.dynamicwidget.DynamicWidgetUpdater
import voltra.dynamicwidget.VoltraConfigurationStore
import voltra.dynamicwidget.serverupdate.DynamicWidgetServerUpdateScheduler
import voltra.dynamicwidget.triggerDynamicWidgetConfigurationGlanceUpdate
import voltra.dynamicwidget.triggerDynamicWidgetGlanceUpdate
import voltra.dynamicwidget.triggerDynamicWidgetInstanceConfigurationGlanceUpdate
import voltra.glance.renderers.arc.ArcBitmapCache
import voltra.images.VoltraImageManager
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.VoltraWidgetReceiver
import voltra.widget.VoltraWidgetReceivers
import voltra.widget.payload.PayloadWidgetUpdateRejection
import voltra.widget.payload.PayloadWidgetUpdater
import voltra.widget.payload.VoltraGlanceWidget
import voltra.widget.payload.VoltraWidgetManager
import voltra.widget.server.VoltraWidgetCredentialStore
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerUpdateSettings
import voltra.widget.server.WidgetServerUpdateSettingsJson

class VoltraModule(
    reactContext: ReactApplicationContext,
) : NativeVoltraAndroidSpec(reactContext) {
    companion object {
        private const val TAG = "VoltraModule"
        private const val ERROR_INVALID_NOTIFICATION_OPTIONS = "VOLTRA_INVALID_NOTIFICATION_OPTIONS"
    }

    private val notificationManager by lazy {
        VoltraNotificationManager(reactApplicationContext)
    }

    private val widgetManager by lazy {
        VoltraWidgetManager(reactApplicationContext)
    }

    private val widgetServerUpdateCoordinator by lazy {
        WidgetServerUpdateCoordinator(reactApplicationContext)
    }

    private val widgetOrchestrator by lazy {
        WidgetOrchestrator(reactApplicationContext, widgetManager)
    }

    private val imageManager by lazy {
        VoltraImageManager(reactApplicationContext)
    }

    private val dynamicWidgetPropsStore by lazy {
        DynamicWidgetPropsStore(reactApplicationContext)
    }

    private val dynamicWidgetUpdater by lazy {
        DynamicWidgetUpdater(
            dynamicWidgetKindResolver = { dynamicWidgetId ->
                VoltraWidgetKindResolver.resolve(reactApplicationContext, dynamicWidgetId)
            },
            dynamicWidgetPropsPersistence = dynamicWidgetPropsStore,
            dynamicWidgetUpdateTrigger =
                DynamicWidgetUpdateTrigger { dynamicWidgetId ->
                    triggerDynamicWidgetGlanceUpdate(
                        context = reactApplicationContext,
                        dynamicWidgetId = dynamicWidgetId,
                    )
                },
        )
    }

    /**
     * Validates an `appWidgetId` from JS into a Voltra widget id before any per-instance
     * configuration write (ADR 0006).
     */
    private val dynamicWidgetInstanceResolver by lazy {
        DynamicWidgetInstanceResolver(AndroidDynamicWidgetInstanceBoundary(reactApplicationContext))
    }

    private val payloadWidgetUpdater by lazy {
        PayloadWidgetUpdater(
            payloadWidgetKindResolver = { widgetId ->
                VoltraWidgetKindResolver.resolve(reactApplicationContext, widgetId)
            },
            payloadWidgetPersistence = { widgetId, jsonString, deepLinkUrl ->
                widgetManager.writeWidgetData(widgetId, jsonString, deepLinkUrl)
            },
            payloadWidgetUpdateTrigger = { widgetId ->
                widgetManager.updateWidget(widgetId)
            },
        )
    }

    // Last-seen night-mode bit. ACTION_CONFIGURATION_CHANGED also fires for rotation, font scale,
    // locale, etc., so we re-render only when the light/dark bit actually changes.
    private var lastNightMode: Int =
        reactContext.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK

    // Re-renders client widgets when the system color scheme (light/dark) flips. Client widgets read
    // env.colorScheme on-device, so a flip must re-run their render. Uses ComponentCallbacks rather
    // than an ACTION_CONFIGURATION_CHANGED BroadcastReceiver: onConfigurationChanged delivers the
    // authoritative new Configuration (a receiver's context.resources lags the change), and it isn't
    // subject to the cached-process broadcast restrictions. Active while the host process is alive.
    private val configurationCallbacks =
        object : ComponentCallbacks {
            override fun onConfigurationChanged(newConfig: Configuration) {
                val nightMode = newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK
                if (nightMode == lastNightMode) return
                lastNightMode = nightMode
                // Arc bitmaps are keyed by their resolved colors, so entries rendered for the old
                // scheme stay correct but are unlikely to be requested again. Drop them here so
                // the cache does not hold both schemes' bitmaps for the life of the process.
                ArcBitmapCache.clear()
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        widgetOrchestrator.reloadClientWidgets()
                    } catch (e: Exception) {
                        Log.e(TAG, "Color-scheme reload failed: ${e.message}")
                    }
                }
            }

            override fun onLowMemory() = Unit
        }

    override fun initialize() {
        super.initialize()
        reactApplicationContext.registerComponentCallbacks(configurationCallbacks)
    }

    override fun invalidate() {
        try {
            reactApplicationContext.unregisterComponentCallbacks(configurationCallbacks)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to unregister configuration callbacks: ${e.message}")
        }
        super.invalidate()
    }

    /**
     * Resolves [promise] with the result of [mutation], turning an invalid option into a rejection.
     *
     * Ongoing notification options may come from a push that an older release of the app put on the
     * wire, so a value this release cannot honour has to fail the call the way every other failure
     * does rather than escape the TurboModule method.
     */
    private fun resolveOngoingNotificationMutation(
        promise: Promise,
        mutation: () -> WritableNativeMap,
    ) {
        try {
            promise.resolve(mutation())
        } catch (error: IllegalArgumentException) {
            Log.e(TAG, "Rejected Android ongoing notification: ${error.message}")
            promise.reject(ERROR_INVALID_NOTIFICATION_OPTIONS, error.message)
        }
    }

    override fun startAndroidOngoingNotification(
        payload: String,
        options: ReadableMap,
        promise: Promise,
    ) {
        Log.d(TAG, "startAndroidOngoingNotification called")
        val opts = AndroidOngoingNotificationOptions(options)
        resolveOngoingNotificationMutation(promise) {
            val result = runBlocking { notificationManager.startOngoingNotification(payload, opts) }
            Log.d(TAG, "startAndroidOngoingNotification returning: $result")
            result.toWritableMap()
        }
    }

    override fun updateAndroidOngoingNotification(
        notificationId: String,
        payload: String,
        options: ReadableMap?,
        promise: Promise,
    ) {
        Log.d(TAG, "updateAndroidOngoingNotification called with notificationId=$notificationId")
        val opts =
            options?.let { AndroidOngoingNotificationOptions(it) }
                ?: AndroidOngoingNotificationOptions()
        resolveOngoingNotificationMutation(promise) {
            val result =
                runBlocking {
                    notificationManager.updateOngoingNotification(notificationId, payload, opts)
                }
            Log.d(TAG, "updateAndroidOngoingNotification returning: $result")
            result.toWritableMap()
        }
    }

    override fun upsertAndroidOngoingNotification(
        payload: String,
        options: ReadableMap,
        promise: Promise,
    ) {
        Log.d(TAG, "upsertAndroidOngoingNotification called")
        val opts = AndroidOngoingNotificationOptions(options)
        resolveOngoingNotificationMutation(promise) {
            val result = runBlocking { notificationManager.upsertOngoingNotification(payload, opts) }
            Log.d(TAG, "upsertAndroidOngoingNotification returning: $result")
            result.toWritableMap()
        }
    }

    override fun stopAndroidOngoingNotification(
        notificationId: String,
        promise: Promise,
    ) {
        Log.d(TAG, "stopAndroidOngoingNotification called with notificationId=$notificationId")
        val result = notificationManager.stopOngoingNotification(notificationId)
        promise.resolve(result.toWritableMap())
    }

    override fun isAndroidOngoingNotificationActive(notificationId: String): Boolean =
        notificationManager.isOngoingNotificationActive(notificationId)

    override fun getAndroidOngoingNotificationStatus(notificationId: String): WritableNativeMap {
        val status = notificationManager.getOngoingNotificationStatus(notificationId)
        return WritableNativeMap().apply {
            putBoolean("isActive", status.isActive)
            putBoolean("isDismissed", status.isDismissed)
            putBoolean("isPromoted", status.isPromoted ?: false)
            putBoolean("hasPromotableCharacteristics", status.hasPromotableCharacteristics ?: false)
        }
    }

    override fun endAllAndroidOngoingNotifications(promise: Promise) {
        runBlocking { notificationManager.endAllOngoingNotifications() }
        promise.resolve(null)
    }

    override fun canPostPromotedAndroidNotifications(): Boolean =
        notificationManager.canPostPromotedAndroidNotifications()

    override fun getAndroidOngoingNotificationCapabilities(): WritableNativeMap {
        val capabilities = notificationManager.getOngoingNotificationCapabilities()
        return WritableNativeMap().apply {
            putInt("apiLevel", capabilities.apiLevel)
            putBoolean("notificationsEnabled", capabilities.notificationsEnabled)
            putBoolean("supportsPromotedNotifications", capabilities.supportsPromotedNotifications)
            putBoolean("canPostPromotedNotifications", capabilities.canPostPromotedNotifications)
            putBoolean("canRequestPromotedOngoing", capabilities.canRequestPromotedOngoing)
        }
    }

    override fun openAndroidNotificationSettings(promise: Promise) {
        runBlocking { notificationManager.openPromotedNotificationSettings() }
        promise.resolve(null)
    }

    override fun updateAndroidWidget(
        widgetId: String,
        jsonString: String,
        options: ReadableMap?,
        promise: Promise,
    ) {
        Log.d(TAG, "updateAndroidWidget called with widgetId=$widgetId")
        val deepLinkUrl = options?.getString("deepLinkUrl")
        runBlocking {
            // promise.resolve(null) is called only after the try/catch below completes without
            // rejecting, so a throwing resolve can never be followed by a reject call.
            val succeeded =
                try {
                    payloadWidgetUpdater.updatePayloadWidget(
                        widgetId = widgetId,
                        jsonString = jsonString,
                        deepLinkUrl = deepLinkUrl,
                    )
                    true
                } catch (kindMismatch: PayloadWidgetUpdateRejection.KindMismatch) {
                    Log.e(TAG, "updateAndroidWidget rejected: ${kindMismatch.message}")
                    promise.reject("VOLTRA_WIDGET_KIND_MISMATCH", kindMismatch.message)
                    false
                } catch (e: Exception) {
                    Log.e(TAG, "updateAndroidWidget failed", e)
                    promise.reject("VOLTRA_WIDGET_UPDATE_FAILED", e.message, e)
                    false
                }
            if (succeeded) {
                Log.d(TAG, "updateAndroidWidget completed")
                promise.resolve(null)
            }
        }
    }

    override fun updateAndroidDynamicWidget(
        dynamicWidgetId: String,
        dynamicWidgetPropsJson: String,
        promise: Promise,
    ) {
        Log.d(TAG, "updateAndroidDynamicWidget called with dynamicWidgetId=$dynamicWidgetId")
        runBlocking {
            // promise.resolve(null) is called only after the try/catch below completes without
            // rejecting, so a throwing resolve can never be followed by a reject call.
            val succeeded =
                try {
                    dynamicWidgetUpdater.updateDynamicWidget(
                        dynamicWidgetId = dynamicWidgetId,
                        dynamicWidgetPropsJson = dynamicWidgetPropsJson,
                    )
                    true
                } catch (kindMismatch: DynamicWidgetUpdateRejection.KindMismatch) {
                    Log.e(TAG, "updateAndroidDynamicWidget rejected: ${kindMismatch.message}")
                    promise.reject("VOLTRA_WIDGET_KIND_MISMATCH", kindMismatch.message)
                    false
                } catch (notFound: DynamicWidgetUpdateRejection.NotFound) {
                    Log.e(TAG, "updateAndroidDynamicWidget rejected: ${notFound.message}")
                    promise.reject("VOLTRA_WIDGET_NOT_FOUND", notFound.message)
                    false
                } catch (dynamicWidgetUpdateException: Exception) {
                    Log.e(TAG, "updateAndroidDynamicWidget failed", dynamicWidgetUpdateException)
                    promise.reject(
                        "VOLTRA_DYNAMIC_WIDGET_UPDATE_ERROR",
                        dynamicWidgetUpdateException.message,
                        dynamicWidgetUpdateException,
                    )
                    false
                }
            if (succeeded) {
                // Belt and braces (ADR 0000): a payload from before PR #261, or from the old
                // updateAndroidWidget misuse, can still be cached for this id. Purge it now so
                // WidgetOrchestrator.reloadAllWidgets can never mistake this Dynamic Widget for a
                // payload-driven one because of stale SharedPreferences state.
                if (dynamicWidgetId in widgetManager.cachedWidgetIds()) {
                    Log.d(
                        TAG,
                        "updateAndroidDynamicWidget: purging stale cached payload for $dynamicWidgetId",
                    )
                    widgetManager.clearWidgetData(dynamicWidgetId)
                }
                Log.d(TAG, "updateAndroidDynamicWidget completed")
                promise.resolve(null)
            }
        }
    }

    override fun reloadAndroidWidgets(
        widgetIds: ReadableArray?,
        promise: Promise,
    ) {
        Log.d(TAG, "reloadAndroidWidgets called with widgetIds=$widgetIds")
        val ids: List<String>? =
            widgetIds?.let { array ->
                (0 until array.size()).mapNotNull { array.getString(it) }
            }
        runBlocking { widgetOrchestrator.reloadWidgets(ids) }
        Log.d(TAG, "reloadAndroidWidgets completed")
        promise.resolve(null)
    }

    override fun setWidgetConfiguration(
        widgetId: String,
        key: String,
        value: String,
        promise: Promise,
    ) {
        // Stand-in for a Glance configuration activity: persist a config value and re-render the
        // widget so its client render picks it up via env.configuration. Configuration only
        // applies to Dynamic Widgets.
        when (val resolution = VoltraWidgetKindResolver.resolve(reactApplicationContext, widgetId)) {
            is VoltraWidgetKindResolution.Resolved -> {
                if (resolution.kind != VoltraWidgetKind.Dynamic) {
                    promise.reject(
                        "VOLTRA_WIDGET_KIND_MISMATCH",
                        "Widget '$widgetId' is a payload-driven widget and has no configuration. " +
                            "setWidgetConfiguration only applies to Dynamic Widgets.",
                    )
                    return
                }
            }

            is VoltraWidgetKindResolution.Unresolved -> {
                promise.reject("VOLTRA_WIDGET_NOT_FOUND", resolution.reason)
                return
            }
        }

        runBlocking {
            try {
                VoltraConfigurationStore(reactApplicationContext).set(widgetId, key, value)
                // Advances each placement's configuration revision before updating it, so a live
                // Glance session re-reads the store instead of redrawing its captured values.
                triggerDynamicWidgetConfigurationGlanceUpdate(reactApplicationContext, widgetId)
                // A type-level write can move any placement without its own value for `key` to a
                // different instance (ADR 0007), so the scope set is recomputed from placements.
                DynamicWidgetServerUpdateScheduler.recompute(reactApplicationContext, widgetId)
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "setWidgetConfiguration failed", e)
                promise.reject("VOLTRA_WIDGET_CONFIG_ERROR", e.message, e)
            }
        }
    }

    /**
     * Write configuration for one placed widget instance (ADR 0006). Every key of [valuesJson] is
     * written in a single DataStore transaction, so a multi-key write is never half-applied and
     * costs one re-render.
     *
     * Rejects before anything is stored when [appWidgetId] is not a placement of one of this app's
     * Dynamic Widgets.
     */
    override fun setWidgetInstanceConfiguration(
        appWidgetId: Double,
        valuesJson: String,
        promise: Promise,
    ) {
        val instanceId = appWidgetId.toInt()
        val widgetId =
            resolveDynamicWidgetInstanceOrReject(instanceId, promise) ?: return

        val values =
            try {
                parseConfigurationValues(valuesJson)
            } catch (e: Exception) {
                promise.reject("VOLTRA_WIDGET_CONFIG_ERROR", "Could not read configuration values: ${e.message}", e)
                return
            }

        // The promise is settled exactly once: a failed write rejects and returns here, so it is
        // never followed by a re-render or a resolve (see updateAndroidDynamicWidget).
        val written =
            runBlocking {
                try {
                    VoltraConfigurationStore(reactApplicationContext)
                        .setInstanceValues(widgetId, instanceId, values)
                    // The placement may have moved to a different instance scope (ADR 0007).
                    DynamicWidgetServerUpdateScheduler.recompute(reactApplicationContext, widgetId)
                    true
                } catch (e: Exception) {
                    Log.e(TAG, "setWidgetInstanceConfiguration failed", e)
                    promise.reject("VOLTRA_WIDGET_CONFIG_ERROR", e.message, e)
                    false
                }
            }
        if (!written) return

        rerenderWidgetInstance(widgetId, instanceId)
        promise.resolve(null)
    }

    /** The merged three-layer configuration one placement renders with, as a JSON object. */
    override fun getWidgetInstanceConfiguration(
        appWidgetId: Double,
        promise: Promise,
    ) {
        val instanceId = appWidgetId.toInt()
        val widgetId =
            resolveDynamicWidgetInstanceOrReject(instanceId, promise) ?: return

        runBlocking {
            try {
                val values = VoltraConfigurationStore(reactApplicationContext).get(widgetId, instanceId)
                promise.resolve(configurationValuesToJson(values))
            } catch (e: Exception) {
                Log.e(TAG, "getWidgetInstanceConfiguration failed", e)
                promise.reject("VOLTRA_WIDGET_CONFIG_ERROR", e.message, e)
            }
        }
    }

    /**
     * The defaults plus widget-type values of a Dynamic Widget, as a JSON object — what a placement
     * with no values of its own renders with.
     */
    override fun getWidgetConfiguration(
        widgetId: String,
        promise: Promise,
    ) {
        when (val resolution = VoltraWidgetKindResolver.resolve(reactApplicationContext, widgetId)) {
            is VoltraWidgetKindResolution.Resolved -> {
                if (resolution.kind != VoltraWidgetKind.Dynamic) {
                    promise.reject(
                        "VOLTRA_WIDGET_KIND_MISMATCH",
                        "Widget '$widgetId' is a payload-driven widget and has no configuration. " +
                            "getWidgetConfiguration only applies to Dynamic Widgets.",
                    )
                    return
                }
            }

            is VoltraWidgetKindResolution.Unresolved -> {
                promise.reject("VOLTRA_WIDGET_NOT_FOUND", resolution.reason)
                return
            }
        }

        runBlocking {
            try {
                val values = VoltraConfigurationStore(reactApplicationContext).get(widgetId)
                promise.resolve(configurationValuesToJson(values))
            } catch (e: Exception) {
                Log.e(TAG, "getWidgetConfiguration failed", e)
                promise.reject("VOLTRA_WIDGET_CONFIG_ERROR", e.message, e)
            }
        }
    }

    /**
     * Drop one placement's own configuration so it falls back to the widget-type values and the
     * defaults. The widget-type values are left alone.
     */
    override fun clearWidgetInstanceConfiguration(
        appWidgetId: Double,
        promise: Promise,
    ) {
        val instanceId = appWidgetId.toInt()
        val widgetId =
            resolveDynamicWidgetInstanceOrReject(instanceId, promise) ?: return

        // Settled exactly once, as in setWidgetInstanceConfiguration.
        val cleared =
            runBlocking {
                try {
                    VoltraConfigurationStore(reactApplicationContext).clearInstance(widgetId, instanceId)
                    // The placement fell back to the widget-type configuration, possibly a
                    // different instance scope (ADR 0007).
                    DynamicWidgetServerUpdateScheduler.recompute(reactApplicationContext, widgetId)
                    true
                } catch (e: Exception) {
                    Log.e(TAG, "clearWidgetInstanceConfiguration failed", e)
                    promise.reject("VOLTRA_WIDGET_CONFIG_ERROR", e.message, e)
                    false
                }
            }
        if (!cleared) return

        rerenderWidgetInstance(widgetId, instanceId)
        promise.resolve(null)
    }

    /**
     * The Voltra widget id [appWidgetId] is a placement of, or null after rejecting [promise] with
     * the code that says why it is not usable. Nothing is written before this passes (ADR 0000).
     */
    private fun resolveDynamicWidgetInstanceOrReject(
        appWidgetId: Int,
        promise: Promise,
    ): String? =
        try {
            dynamicWidgetInstanceResolver.resolveDynamicWidgetId(appWidgetId)
        } catch (rejection: DynamicWidgetInstanceRejection) {
            val code =
                when (rejection) {
                    is DynamicWidgetInstanceRejection.InstanceNotFound -> "VOLTRA_WIDGET_INSTANCE_NOT_FOUND"
                    is DynamicWidgetInstanceRejection.KindMismatch -> "VOLTRA_WIDGET_KIND_MISMATCH"
                    is DynamicWidgetInstanceRejection.WidgetNotFound -> "VOLTRA_WIDGET_NOT_FOUND"
                }
            promise.reject(code, rejection.message)
            null
        } catch (e: Throwable) {
            // Resolution reaches AppWidgetManager and the PackageManager over Binder, either of
            // which can fail with a RuntimeException (a dead system process, or an oversized
            // component list). Without this the exception would escape the module method and leave
            // the promise neither resolved nor rejected.
            Log.e(TAG, "Could not resolve widget instance $appWidgetId", e)
            promise.reject("VOLTRA_WIDGET_CONFIG_ERROR", e.message, e)
            null
        }

    /**
     * Re-render only the placement that changed, using the single-`GlanceId` overload, so sibling
     * placements of the same widget are not redrawn. The placement's configuration revision is
     * advanced first: Glance does not re-run `provideGlance` for a widget whose session is still
     * alive, so without the bump the widget would redraw the values it captured when its session
     * began and only pick the new ones up once that session idled out.
     *
     * Dispatched rather than awaited: a Dynamic Widget render evaluates the widget's JS bundle in
     * the Hermes runtime, and in a debug build fetches it from Metro first, so awaiting it would
     * block the calling thread for as long as that takes (the ANR risk the pin-preview path in this
     * file already calls out). ADR 0006 decouples the two — the value is persisted before this
     * runs, and a re-render that never happens is picked up when the widget next renders from
     * scratch, exactly as when the app writes while the launcher is not showing the widget.
     *
     * Failure is logged, never surfaced. Caught as [Throwable], not [Exception]: this path reaches
     * the JNI renderer, whose missing native dependency surfaces as [NoClassDefFoundError] or
     * [UnsatisfiedLinkError], neither of which is an [Exception] (see `VoltraWidgetKindResolver`).
     */
    private fun rerenderWidgetInstance(
        widgetId: String,
        appWidgetId: Int,
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                triggerDynamicWidgetInstanceConfigurationGlanceUpdate(
                    context = reactApplicationContext,
                    dynamicWidgetId = widgetId,
                    dynamicWidgetAppWidgetId = appWidgetId,
                )
            } catch (e: Throwable) {
                Log.w(TAG, "Could not re-render widget '$widgetId' instance $appWidgetId: ${e.message}")
            }
        }
    }

    /**
     * Configuration values are strings. `JSONObject.getString` would coerce, storing a number as
     * its digits and a JSON null as the literal "null", so each value is checked instead — the
     * store's invariant should not depend on the JS wrapper being the only caller.
     */
    private fun parseConfigurationValues(valuesJson: String): Map<String, String> {
        val root = JSONObject(valuesJson)
        val values = mutableMapOf<String, String>()
        root.keys().forEach { key ->
            when (val value = root.opt(key)) {
                is String -> {
                    values[key] = value
                }

                else -> {
                    throw IllegalArgumentException(
                        "Configuration values must be strings, but '$key' is " +
                            "${if (value == null || value == JSONObject.NULL) "null" else value.javaClass.simpleName}.",
                    )
                }
            }
        }
        return values
    }

    private fun configurationValuesToJson(values: Map<String, String>): String {
        val root = JSONObject()
        values.forEach { (key, value) -> root.put(key, value) }
        return root.toString()
    }

    override fun clearAndroidWidget(
        widgetId: String,
        promise: Promise,
    ) {
        Log.d(TAG, "clearAndroidWidget called with widgetId=$widgetId")
        widgetManager.clearWidgetData(widgetId)
        dynamicWidgetPropsStore.clearDynamicWidgetProps(widgetId)
        runBlocking { widgetServerUpdateCoordinator.dropWidgetLayer(widgetId) }
        runBlocking {
            when (val resolution = VoltraWidgetKindResolver.resolve(reactApplicationContext, widgetId)) {
                is VoltraWidgetKindResolution.Resolved -> {
                    if (resolution.kind == VoltraWidgetKind.Dynamic) {
                        triggerDynamicWidgetGlanceUpdate(
                            context = reactApplicationContext,
                            dynamicWidgetId = widgetId,
                        )
                    } else {
                        widgetManager.updateWidget(widgetId)
                    }
                }

                is VoltraWidgetKindResolution.Unresolved -> {
                    Log.w(TAG, "clearAndroidWidget: could not resolve kind for '$widgetId': ${resolution.reason}")
                    widgetManager.updateWidget(widgetId)
                }
            }
        }
        Log.d(TAG, "clearAndroidWidget completed")
        promise.resolve(null)
    }

    override fun clearAllAndroidWidgets(promise: Promise) {
        Log.d(TAG, "clearAllAndroidWidgets called")
        widgetManager.clearAllWidgetData()
        dynamicWidgetPropsStore.clearAllDynamicWidgetProps()
        runBlocking {
            for (widgetId in VoltraWidgetServer.serverDrivenWidgetIds(reactApplicationContext)) {
                widgetServerUpdateCoordinator.dropWidgetLayer(widgetId)
            }
        }
        runBlocking { widgetOrchestrator.reloadAllWidgets() }
        Log.d(TAG, "clearAllAndroidWidgets completed")
        promise.resolve(null)
    }

    override fun requestPinGlanceAppWidget(
        widgetId: String,
        options: ReadableMap?,
        promise: Promise,
    ) {
        Log.d(TAG, "requestPinGlanceAppWidget called with widgetId=$widgetId")
        val receiverClassName = VoltraWidgetReceivers.className(reactApplicationContext, widgetId)
        Log.d(TAG, "Looking for receiver: $receiverClassName")

        val receiverClass =
            try {
                @Suppress("UNCHECKED_CAST")
                Class.forName(receiverClassName) as Class<out androidx.glance.appwidget.GlanceAppWidgetReceiver>
            } catch (e: ClassNotFoundException) {
                Log.e(TAG, "Widget receiver class not found: $receiverClassName", e)
                promise.reject("requestPinGlanceAppWidget", "Widget receiver not found for id: $widgetId", e)
                return
            }

        val glanceManager = GlanceAppWidgetManager(reactApplicationContext)
        val previewSize =
            if (options != null) {
                val width = if (options.hasKey("previewWidth")) options.getDouble("previewWidth").toFloat() else null
                val height = if (options.hasKey("previewHeight")) options.getDouble("previewHeight").toFloat() else null
                if (width != null && height != null) DpSize(width.dp, height.dp) else null
            } else {
                null
            }

        // A composed preview only matters when a preview size was requested; resolve the kind
        // first so a Dynamic Widget's preview never composes its registered widget -- doing so
        // would evaluate its JS inside the runBlocking below, on the calling thread (ANR risk) --
        // and an unresolved id rejects instead of the widget being pinned in the loading state.
        val previewWidget: GlanceAppWidget? =
            if (previewSize != null) {
                when (val resolution = VoltraWidgetKindResolver.resolve(reactApplicationContext, widgetId)) {
                    is VoltraWidgetKindResolution.Unresolved -> {
                        Log.e(TAG, "requestPinGlanceAppWidget rejected: ${resolution.reason}")
                        promise.reject("VOLTRA_WIDGET_NOT_FOUND", resolution.reason)
                        return
                    }

                    is VoltraWidgetKindResolution.Resolved -> {
                        if (resolution.kind == VoltraWidgetKind.Dynamic) {
                            // Let the launcher fall back to the provider's preview image/layout.
                            null
                        } else {
                            // Use the registered widget for this id (the right Glance class for
                            // its kind) instead of assuming the payload-driven VoltraGlanceWidget.
                            VoltraWidgetReceiver.getWidget(reactApplicationContext, widgetId)
                                ?: VoltraGlanceWidget(widgetId)
                        }
                    }
                }
            } else {
                null
            }

        val result =
            runBlocking {
                if (previewSize != null && previewWidget != null) {
                    glanceManager.requestPinGlanceAppWidget(
                        receiver = receiverClass,
                        preview = previewWidget,
                        previewState = previewSize,
                    )
                } else {
                    glanceManager.requestPinGlanceAppWidget(receiverClass)
                }
            }

        Log.d(TAG, "requestPinGlanceAppWidget completed with result=$result")
        promise.resolve(result)
    }

    override fun preloadImages(
        images: ReadableArray,
        promise: Promise,
    ) {
        Log.d(TAG, "preloadImages called with ${images.size()} images")
        val result =
            runBlocking {
                (0 until images.size())
                    .mapNotNull { i -> images.getMap(i) }
                    .map { img ->
                        async {
                            val key = img.getString("key") ?: return@async Pair(null, "missing key")
                            val url = if (img.hasKey("url")) img.getString("url") else null
                            val svg = if (img.hasKey("svg")) img.getString("svg") else null
                            val method = if (img.hasKey("method")) img.getString("method") ?: "GET" else "GET"
                            val width = if (img.hasKey("width")) img.getDouble("width").toInt() else null
                            val height = if (img.hasKey("height")) img.getDouble("height").toInt() else null

                            @Suppress("UNCHECKED_CAST")
                            val headers =
                                if (img.hasKey("headers")) {
                                    img.getMap("headers")?.toHashMap()?.mapValues { it.value as String }
                                } else {
                                    null
                                }

                            try {
                                if (!svg.isNullOrBlank()) {
                                    imageManager.preloadSvgImage(
                                        key = key,
                                        svg = svg,
                                        width = width,
                                        height = height,
                                    )
                                } else {
                                    imageManager.preloadUrlImage(
                                        key = key,
                                        url =
                                            url
                                                ?: throw IllegalArgumentException(
                                                    "Image '$key' must provide either url or svg",
                                                ),
                                        method = method,
                                        headers = headers,
                                        width = width,
                                        height = height,
                                    )
                                }
                                Pair(key, null)
                            } catch (error: Exception) {
                                Log.e(TAG, "Error preloading image: $key", error)
                                Pair(key, error.message ?: "Failed to preload image")
                            }
                        }
                    }.awaitAll()
            }

        val succeeded = result.filter { it.second == null }.mapNotNull { it.first }
        val failed =
            result.filter { it.second != null }.map { (key, error) ->
                WritableNativeMap().apply {
                    putString("key", key)
                    putString("error", error)
                }
            }

        val out =
            WritableNativeMap().apply {
                putArray("succeeded", Arguments.fromList(succeeded))
                val failedArray = Arguments.createArray()
                failed.forEach { failedArray.pushMap(it) }
                putArray("failed", failedArray)
            }
        promise.resolve(out)
    }

    override fun clearPreloadedImages(
        keys: ReadableArray?,
        promise: Promise,
    ) {
        Log.d(TAG, "clearPreloadedImages called with keys=$keys")
        val keyList: List<String>? =
            keys?.let { array ->
                (0 until array.size()).mapNotNull { array.getString(it) }
            }
        imageManager.clearPreloadedImages(keyList)
        promise.resolve(null)
    }

    override fun setWidgetServerUpdate(
        settingsJson: String,
        widgetId: String?,
        promise: Promise,
    ) {
        Log.d(TAG, "setWidgetServerUpdate called for widgetId=${widgetId ?: "<all>"}")

        runBlocking {
            when (val result = widgetServerUpdateCoordinator.set(settingsJson, widgetId)) {
                is WidgetServerUpdateCoordinator.Result.Applied -> {
                    promise.resolve(null)
                }

                is WidgetServerUpdateCoordinator.Result.Rejected -> {
                    promise.reject("VOLTRA_INVALID_SERVER_UPDATE_SETTINGS", result.reason)
                }
            }
        }
    }

    override fun clearWidgetServerUpdate(
        widgetId: String?,
        promise: Promise,
    ) {
        Log.d(TAG, "clearWidgetServerUpdate called for widgetId=${widgetId ?: "<all>"}")

        runBlocking {
            when (val result = widgetServerUpdateCoordinator.clear(widgetId)) {
                is WidgetServerUpdateCoordinator.Result.Applied -> {
                    promise.resolve(null)
                }

                is WidgetServerUpdateCoordinator.Result.Rejected -> {
                    promise.reject("VOLTRA_INVALID_SERVER_UPDATE_SETTINGS", result.reason)
                }
            }
        }
    }

    /**
     * Reads settings back rather than reasoning about what was set: with [widgetId] given, the
     * fully resolved settings that widget would fetch with right now (or null if it is not
     * server-driven); with none, the raw global layer only, no defaults applied.
     */
    override fun getWidgetServerUpdate(
        widgetId: String?,
        promise: Promise,
    ) {
        Log.d(TAG, "getWidgetServerUpdate called for widgetId=${widgetId ?: "<all>"}")

        runBlocking {
            try {
                val resolver = VoltraWidgetServer.resolver(reactApplicationContext)

                if (widgetId != null) {
                    val scope = WidgetScope.of(widgetId)

                    if (!resolver.isServerDriven(scope)) {
                        promise.resolve(null)
                        return@runBlocking
                    }

                    val resolved = resolver.resolve(scope)
                    val settings =
                        WidgetServerUpdateSettings(
                            url = resolved.url,
                            intervalMinutes = resolved.intervalMinutes,
                            enabled = resolved.enabled,
                            method = resolved.method,
                            query = resolved.query,
                            headers = resolved.headers,
                            body = resolved.body,
                        )

                    promise.resolve(WidgetServerUpdateSettingsJson.stringify(settings))
                } else {
                    val global = resolver.globalSettings()
                    promise.resolve(global?.let { WidgetServerUpdateSettingsJson.stringify(it) })
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to read widget server settings: ${e.message}", e)
                promise.reject("VOLTRA_GET_SERVER_UPDATE_FAILED", e.message, e)
            }
        }
    }

    /**
     * Deprecated in favour of [setWidgetServerUpdate] with an `Authorization` header. Kept as a
     * wrapper over the same encrypted records, so an app that has not migrated keeps working and
     * nothing has to be moved on device.
     */
    override fun setWidgetServerCredentials(
        credentials: ReadableMap,
        promise: Promise,
    ) {
        Log.d(TAG, "setWidgetServerCredentials called")
        val token =
            credentials.getString("token")
                ?: run {
                    promise.reject("setWidgetServerCredentials", "token is required")
                    return
                }

        @Suppress("UNCHECKED_CAST")
        val headers =
            if (credentials.hasKey("headers")) {
                credentials.getMap("headers")?.toHashMap()?.mapValues { it.value as String }
            } else {
                null
            }

        runBlocking {
            VoltraWidgetCredentialStore.saveToken(reactApplicationContext, token)
            if (!headers.isNullOrEmpty()) {
                VoltraWidgetCredentialStore.saveHeaders(reactApplicationContext, headers)
            }
        }

        runBlocking { widgetServerUpdateCoordinator.onCredentialsChanged() }
        Log.d(TAG, "Widget server credentials saved")
        promise.resolve(null)
    }

    /** Deprecated alongside [setWidgetServerCredentials]. */
    override fun clearWidgetServerCredentials(promise: Promise) {
        Log.d(TAG, "clearWidgetServerCredentials called")
        runBlocking {
            VoltraWidgetCredentialStore.clearAll(reactApplicationContext)
            widgetServerUpdateCoordinator.onCredentialsChanged()
        }
        Log.d(TAG, "Widget server credentials cleared")
        promise.resolve(null)
    }

    override fun getActiveWidgets(promise: Promise) {
        val manager = AppWidgetManager.getInstance(reactApplicationContext)
        val packageName = reactApplicationContext.packageName
        val installedProviders =
            manager.installedProviders.filter {
                it.provider.packageName == packageName
            }

        // Prefer the declared receivers, so widgetType only ever names a Voltra widget this app
        // actually declares. Parsing the class name stays as the fallback for when the manifest
        // read fails; it reads the simple name, so it is already package-agnostic.
        val widgetIdsByComponent =
            VoltraWidgetReceivers
                .installedReceivers(reactApplicationContext)
                .entries
                .associate { (widgetId, component) -> component to widgetId }

        val activeWidgets = Arguments.createArray()
        for (providerInfo in installedProviders) {
            val ids = manager.getAppWidgetIds(providerInfo.provider)
            for (id in ids) {
                val opts = manager.getAppWidgetOptions(id)
                val minWidth = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
                val minHeight = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
                val shortClassName = providerInfo.provider.shortClassName
                val widgetType =
                    widgetIdsByComponent[providerInfo.provider]
                        ?: VoltraWidgetReceivers.widgetIdOrNull(providerInfo.provider.className)
                        ?: shortClassName

                activeWidgets.pushMap(
                    WritableNativeMap().apply {
                        // The Voltra widget id, and the Android instance id of this placement.
                        putString("widgetType", widgetType)
                        putInt("appWidgetId", id)
                        // Deprecated aliases of the two fields above, kept at their original
                        // values: `name` has always carried the Voltra widget id and `widgetId`
                        // the Android instance id, which is the wrong way round from every other
                        // API in the package (ADR 0006).
                        putString("name", widgetType)
                        putInt("widgetId", id)
                        putString("providerClassName", shortClassName)
                        putString("label", providerInfo.loadLabel(reactApplicationContext.packageManager).toString())
                        putInt("width", minWidth)
                        putInt("height", minHeight)
                    },
                )
            }
        }
        promise.resolve(activeWidgets)
    }
}
