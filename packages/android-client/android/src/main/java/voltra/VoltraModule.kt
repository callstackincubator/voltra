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
import voltra.dynamicwidget.DynamicWidgetPropsStore
import voltra.dynamicwidget.DynamicWidgetUpdateRejection
import voltra.dynamicwidget.DynamicWidgetUpdateTrigger
import voltra.dynamicwidget.DynamicWidgetUpdater
import voltra.dynamicwidget.VoltraConfigurationStore
import voltra.dynamicwidget.triggerDynamicWidgetGlanceUpdate
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

class VoltraModule(
    reactContext: ReactApplicationContext,
) : NativeVoltraAndroidSpec(reactContext) {
    companion object {
        private const val TAG = "VoltraModule"
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

    override fun startAndroidOngoingNotification(
        payload: String,
        options: ReadableMap,
        promise: Promise,
    ) {
        Log.d(TAG, "startAndroidOngoingNotification called")
        val opts = AndroidOngoingNotificationOptions(options)
        val result = runBlocking { notificationManager.startOngoingNotification(payload, opts) }
        Log.d(TAG, "startAndroidOngoingNotification returning: $result")
        promise.resolve(result.toWritableMap())
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
        val result =
            runBlocking {
                notificationManager.updateOngoingNotification(notificationId, payload, opts)
            }
        Log.d(TAG, "updateAndroidOngoingNotification returning: $result")
        promise.resolve(result.toWritableMap())
    }

    override fun upsertAndroidOngoingNotification(
        payload: String,
        options: ReadableMap,
        promise: Promise,
    ) {
        Log.d(TAG, "upsertAndroidOngoingNotification called")
        val opts = AndroidOngoingNotificationOptions(options)
        val result = runBlocking { notificationManager.upsertOngoingNotification(payload, opts) }
        Log.d(TAG, "upsertAndroidOngoingNotification returning: $result")
        promise.resolve(result.toWritableMap())
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
                VoltraWidgetReceiver.triggerGlanceUpdateOrThrow(reactApplicationContext, widgetId)
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "setWidgetConfiguration failed", e)
                promise.reject("VOLTRA_WIDGET_CONFIG_ERROR", e.message, e)
            }
        }
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

        val activeWidgets = Arguments.createArray()
        for (providerInfo in installedProviders) {
            val ids = manager.getAppWidgetIds(providerInfo.provider)
            for (id in ids) {
                val opts = manager.getAppWidgetOptions(id)
                val minWidth = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
                val minHeight = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
                val shortClassName = providerInfo.provider.shortClassName
                val name = VoltraWidgetReceivers.widgetIdOrNull(providerInfo.provider.className) ?: shortClassName

                activeWidgets.pushMap(
                    WritableNativeMap().apply {
                        putString("name", name)
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
