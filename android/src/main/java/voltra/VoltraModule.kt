package voltra

import android.appwidget.AppWidgetManager
import android.util.Log
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.GlanceAppWidgetManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import voltra.events.VoltraEventBus
import voltra.images.VoltraImageManager
import voltra.widget.VoltraGlanceWidget
import voltra.widget.VoltraWidgetManager

class VoltraModule : Module() {
    companion object {
        private const val TAG = "VoltraModule"
    }

    private val notificationManager by lazy {
        VoltraNotificationManager(appContext.reactContext!!)
    }

    private val widgetManager by lazy {
        VoltraWidgetManager(appContext.reactContext!!)
    }

    private val imageManager by lazy {
        VoltraImageManager(appContext.reactContext!!)
    }

    private val eventBus by lazy {
        VoltraEventBus.getInstance(appContext.reactContext!!)
    }

    private var eventBusUnsubscribe: (() -> Unit)? = null

    override fun definition() =
        ModuleDefinition {
            Name("VoltraModule")

            OnStartObserving {
                Log.d(TAG, "OnStartObserving: Starting event bus subscription")

                // Replay any persisted events from SharedPreferences (cold start)
                val persistedEvents = eventBus.popAll()
                Log.d(TAG, "Replaying ${persistedEvents.size} persisted events")

                persistedEvents.forEach { event ->
                    sendEvent(event.type, event.toMap())
                }

                // Subscribe to hot event delivery (broadcast receiver)
                eventBusUnsubscribe =
                    eventBus.addListener { event ->
                        Log.d(TAG, "Received hot event: ${event.type}")
                        sendEvent(event.type, event.toMap())
                    }
            }

            OnStopObserving {
                Log.d(TAG, "OnStopObserving: Unsubscribing from event bus")
                eventBusUnsubscribe?.invoke()
                eventBusUnsubscribe = null
            }

            // Android Live Update APIs

            AsyncFunction("startAndroidLiveUpdate") {
                payload: String,
                options: Map<String, Any?>,
                ->

                Log.d(TAG, "startAndroidLiveUpdate called")

                val updateName = options["updateName"] as? String
                val channelId = options["channelId"] as? String ?: "voltra_live_updates"

                Log.d(TAG, "updateName=$updateName, channelId=$channelId")

                val result =
                    runBlocking {
                        notificationManager.startLiveUpdate(payload, updateName, channelId)
                    }

                Log.d(TAG, "startAndroidLiveUpdate returning: $result")
                result
            }

            AsyncFunction("updateAndroidLiveUpdate") {
                notificationId: String,
                payload: String,
                ->

                Log.d(TAG, "updateAndroidLiveUpdate called with notificationId=$notificationId")

                runBlocking {
                    notificationManager.updateLiveUpdate(notificationId, payload)
                }

                Log.d(TAG, "updateAndroidLiveUpdate completed")
            }

            AsyncFunction("stopAndroidLiveUpdate") { notificationId: String ->
                Log.d(TAG, "stopAndroidLiveUpdate called with notificationId=$notificationId")
                notificationManager.stopLiveUpdate(notificationId)
            }

            Function("isAndroidLiveUpdateActive") { updateName: String ->
                notificationManager.isLiveUpdateActive(updateName)
            }

            AsyncFunction("endAllAndroidLiveUpdates") {
                notificationManager.endAllLiveUpdates()
            }

            // Android Widget APIs

            AsyncFunction("updateAndroidWidget") {
                widgetId: String,
                jsonString: String,
                options: Map<String, Any?>,
                ->

                Log.d(TAG, "updateAndroidWidget called with widgetId=$widgetId")

                val deepLinkUrl = options["deepLinkUrl"] as? String

                widgetManager.writeWidgetData(widgetId, jsonString, deepLinkUrl)

                runBlocking {
                    widgetManager.updateWidget(widgetId)
                }

                Log.d(TAG, "updateAndroidWidget completed")
            }

            AsyncFunction("reloadAndroidWidgets") { widgetIds: ArrayList<String>? ->
                Log.d(TAG, "reloadAndroidWidgets called with widgetIds=$widgetIds")

                runBlocking {
                    widgetManager.reloadWidgets(widgetIds)
                }

                Log.d(TAG, "reloadAndroidWidgets completed")
            }

            AsyncFunction("clearAndroidWidget") { widgetId: String ->
                Log.d(TAG, "clearAndroidWidget called with widgetId=$widgetId")

                widgetManager.clearWidgetData(widgetId)

                runBlocking {
                    widgetManager.updateWidget(widgetId)
                }

                Log.d(TAG, "clearAndroidWidget completed")
            }

            AsyncFunction("clearAllAndroidWidgets") {
                Log.d(TAG, "clearAllAndroidWidgets called")

                widgetManager.clearAllWidgetData()

                runBlocking {
                    widgetManager.reloadAllWidgets()
                }

                Log.d(TAG, "clearAllAndroidWidgets completed")
            }

            AsyncFunction("getActiveWidgets") {
                val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
                val manager = AppWidgetManager.getInstance(context)
                val packageName = context.packageName

                // 1. Get all providers defined in this app
                val installedProviders =
                    manager.installedProviders.filter {
                        it.provider.packageName == packageName
                    }

                val activeWidgets = mutableListOf<Map<String, Any>>()

                // 2. Iterate over every provider
                for (providerInfo in installedProviders) {
                    val ids = manager.getAppWidgetIds(providerInfo.provider)

                    // 3. Iterate over every instance of that widget
                    for (id in ids) {
                        val options = manager.getAppWidgetOptions(id)
                        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
                        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)

                        // Get short class name (e.g. ".widget.VoltraWidget_weatherReceiver")
                        val shortClassName = providerInfo.provider.shortClassName

                        val prefix = ".widget.VoltraWidget_"
                        val suffix = "Receiver"
                        val name =
                            if (shortClassName.startsWith(prefix) && shortClassName.endsWith(suffix)) {
                                shortClassName.substring(prefix.length, shortClassName.length - suffix.length)
                            } else {
                                shortClassName
                            }

                        activeWidgets.add(
                            mapOf(
                                "name" to name,
                                "widgetId" to id,
                                "providerClassName" to shortClassName,
                                "label" to providerInfo.loadLabel(context.packageManager).toString(),
                                "width" to minWidth,
                                "height" to minHeight,
                            ),
                        )
                    }
                }

                activeWidgets
            }

            AsyncFunction("requestPinGlanceAppWidget") {
                widgetId: String,
                options: Map<String, Any?>?,
                ->

                Log.d(TAG, "requestPinGlanceAppWidget called with widgetId=$widgetId")

                val context = appContext.reactContext!!

                // Construct the receiver class name following the convention
                val receiverClassName = "${context.packageName}.widget.VoltraWidget_${widgetId}Receiver"

                Log.d(TAG, "Looking for receiver: $receiverClassName")

                // Get the receiver class using reflection
                val receiverClass =
                    try {
                        Class.forName(receiverClassName) as Class<out androidx.glance.appwidget.GlanceAppWidgetReceiver>
                    } catch (e: ClassNotFoundException) {
                        Log.e(TAG, "Widget receiver class not found: $receiverClassName", e)
                        throw IllegalArgumentException("Widget receiver not found for id: $widgetId")
                    }

                // Get GlanceAppWidgetManager and request pin
                val glanceManager = GlanceAppWidgetManager(context)

                // Parse preview size from options (optional)
                // See: https://developer.android.com/develop/ui/compose/glance/pin-in-app
                val previewSize =
                    if (options != null) {
                        val width = (options["previewWidth"] as? Number)?.toFloat()
                        val height = (options["previewHeight"] as? Number)?.toFloat()
                        if (width != null && height != null) {
                            DpSize(width.dp, height.dp)
                        } else {
                            null
                        }
                    } else {
                        null
                    }

                val result =
                    runBlocking {
                        // requestPinGlanceAppWidget is a suspend function
                        // See: https://developer.android.com/develop/ui/compose/glance/pin-in-app
                        if (previewSize != null) {
                            // Create preview widget with preview dimensions
                            val previewWidget = VoltraGlanceWidget(widgetId)
                            glanceManager.requestPinGlanceAppWidget(
                                receiver = receiverClass,
                                preview = previewWidget,
                                previewState = previewSize,
                            )
                        } else {
                            // Basic pin request without preview
                            glanceManager.requestPinGlanceAppWidget(receiverClass)
                        }
                    }

                Log.d(TAG, "requestPinGlanceAppWidget completed with result=$result")
                result
            }

            AsyncFunction("preloadImages") { images: List<Map<String, Any>> ->
                Log.d(TAG, "preloadImages called with ${images.size} images")

                runBlocking {
                    val results =
                        images
                            .map { img ->
                                async {
                                    val url = img["url"] as String
                                    val key = img["key"] as String
                                    val method = (img["method"] as? String) ?: "GET"

                                    @Suppress("UNCHECKED_CAST")
                                    val headers = img["headers"] as? Map<String, String>

                                    val resultKey = imageManager.preloadImage(url, key, method, headers)
                                    if (resultKey != null) {
                                        Pair(key, null)
                                    } else {
                                        Pair(key, "Failed to download image")
                                    }
                                }
                            }.awaitAll()

                    val succeeded = results.filter { it.second == null }.map { it.first }
                    val failed =
                        results.filter { it.second != null }.map {
                            mapOf("key" to it.first, "error" to it.second)
                        }

                    mapOf(
                        "succeeded" to succeeded,
                        "failed" to failed,
                    )
                }
            }

            AsyncFunction("clearPreloadedImages") { keys: List<String>? ->
                Log.d(TAG, "clearPreloadedImages called with keys=$keys")
                imageManager.clearPreloadedImages(keys)
            }

            AsyncFunction("reloadLiveActivities") { activityNames: List<String>? ->
                // On Android, we don't have "Live Activities" in the same sense as iOS,
                // but we might want to refresh widgets or notifications.
                // For now, this is a no-op to match iOS API if called.
                Log.d(TAG, "reloadLiveActivities called (no-op on Android)")
            }

            View(VoltraRN::class) {
                Prop("payload") { view, payload: String ->
                    view.setPayload(payload)
                }

                Prop("viewId") { view, viewId: String ->
                    view.setViewId(viewId)
                }
            }
        }
}
