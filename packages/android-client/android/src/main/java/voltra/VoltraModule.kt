package voltra

import android.appwidget.AppWidgetManager
import android.util.Log
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.GlanceAppWidgetManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import voltra.images.VoltraImageManager
import voltra.runtime.VoltraSmokeTest
import voltra.widget.VoltraGlanceWidget
import voltra.widget.VoltraWidgetManager

class VoltraModule(
    reactContext: ReactApplicationContext,
) : NativeVoltraAndroidSpec(reactContext) {
    companion object {
        private const val TAG = "VoltraModule"
    }

    init {
        // Phase 0 — Hermes-on-Android smoke test (Track 4 PoC).
        // Logs to logcat under tag "VoltraSmokeTest". Throwaway — remove when Phase 1 lands.
        VoltraSmokeTest.run()
    }

    private val notificationManager by lazy {
        VoltraNotificationManager(reactApplicationContext)
    }

    private val widgetManager by lazy {
        VoltraWidgetManager(reactApplicationContext)
    }

    private val imageManager by lazy {
        VoltraImageManager(reactApplicationContext)
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
        widgetManager.writeWidgetData(widgetId, jsonString, deepLinkUrl)
        runBlocking { widgetManager.updateWidget(widgetId) }
        Log.d(TAG, "updateAndroidWidget completed")
        promise.resolve(null)
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
        runBlocking { widgetManager.reloadWidgets(ids) }
        Log.d(TAG, "reloadAndroidWidgets completed")
        promise.resolve(null)
    }

    override fun clearAndroidWidget(
        widgetId: String,
        promise: Promise,
    ) {
        Log.d(TAG, "clearAndroidWidget called with widgetId=$widgetId")
        widgetManager.clearWidgetData(widgetId)
        runBlocking { widgetManager.updateWidget(widgetId) }
        Log.d(TAG, "clearAndroidWidget completed")
        promise.resolve(null)
    }

    override fun clearAllAndroidWidgets(promise: Promise) {
        Log.d(TAG, "clearAllAndroidWidgets called")
        widgetManager.clearAllWidgetData()
        runBlocking { widgetManager.reloadAllWidgets() }
        Log.d(TAG, "clearAllAndroidWidgets completed")
        promise.resolve(null)
    }

    override fun requestPinGlanceAppWidget(
        widgetId: String,
        options: ReadableMap?,
        promise: Promise,
    ) {
        Log.d(TAG, "requestPinGlanceAppWidget called with widgetId=$widgetId")
        val receiverClassName = "${reactApplicationContext.packageName}.widget.VoltraWidget_${widgetId}Receiver"
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

        val result =
            runBlocking {
                if (previewSize != null) {
                    val previewWidget = VoltraGlanceWidget(widgetId)
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
            voltra.widget.VoltraWidgetCredentialStore.saveToken(reactApplicationContext, token)
            if (!headers.isNullOrEmpty()) {
                voltra.widget.VoltraWidgetCredentialStore.saveHeaders(reactApplicationContext, headers)
            }
        }

        val wm = voltra.widget.VoltraWidgetManager(reactApplicationContext)
        runBlocking { wm.reloadAllWidgets() }
        Log.d(TAG, "Widget server credentials saved")
        promise.resolve(null)
    }

    override fun clearWidgetServerCredentials(promise: Promise) {
        Log.d(TAG, "clearWidgetServerCredentials called")
        runBlocking { voltra.widget.VoltraWidgetCredentialStore.clearAll(reactApplicationContext) }
        val wm = voltra.widget.VoltraWidgetManager(reactApplicationContext)
        runBlocking { wm.reloadAllWidgets() }
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
                val prefix = ".widget.VoltraWidget_"
                val suffix = "Receiver"
                val name =
                    if (shortClassName.startsWith(prefix) && shortClassName.endsWith(suffix)) {
                        shortClassName.substring(prefix.length, shortClassName.length - suffix.length)
                    } else {
                        shortClassName
                    }

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
