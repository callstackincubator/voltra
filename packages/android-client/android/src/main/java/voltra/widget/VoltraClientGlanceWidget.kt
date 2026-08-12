package voltra.widget

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.res.Configuration
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import androidx.glance.unit.ColorProvider
import com.facebook.react.modules.systeminfo.AndroidInfoHelpers
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import org.json.JSONObject
import voltra.BuildConfig
import voltra.glance.GlanceFactory
import voltra.models.VoltraNode
import voltra.parsing.VoltraDecompressor
import voltra.runtime.VoltraConfigurationStore
import voltra.runtime.VoltraJSRenderer
import java.net.HttpURLConnection
import java.net.URL

/**
 * Client-rendered Voltra widget: downloads a per-widget JS bundle (Metro in dev), evaluates it
 * in the standalone Hermes runtime, and invokes its `render(props, env)` on every Glance render
 * — the Android counterpart of iOS's VoltraClientWidgetProvider.
 *
 * Pipeline:
 *  1. provideGlance (suspend, off the composition): fetch the bundle from Metro and evaluate it
 *     via [VoltraJSRenderer.evaluateBundle].
 *  2. Content (composable): read LocalSize/locale/scheme, build the WidgetEnvironment JSON, call
 *     [VoltraJSRenderer.render], decompress the resulting node, and hand it to [GlanceFactory] —
 *     the same renderer server-rendered widgets use, so the two look identical.
 *
 * On fetch/eval/render failure the widget shows a minimal fallback; the config plugin supplies
 * a prerendered placeholder for the first paint and the offline case.
 */
class VoltraClientGlanceWidget(
    private val widgetId: String = "default",
) : GlanceAppWidget() {
    companion object {
        private const val TAG = "VoltraClientGlanceWidget"

        private val json =
            Json {
                ignoreUnknownKeys = true
                explicitNulls = false
            }

        /** Fetch the raw widget bundle from Metro (dev). Returns null on any network error. */
        private suspend fun fetchDevBundle(
            context: Context,
            widgetId: String,
        ): String? =
            withContext(Dispatchers.IO) {
                // AndroidInfoHelpers resolves the dev server host for emulator (10.0.2.2),
                // physical device, or adb-reverse — the RN-native equivalent of iOS's
                // RCTBundleURLProvider.
                val host = AndroidInfoHelpers.getServerHost(context)
                val urlString = "http://$host/voltra/widgets/$widgetId.bundle?platform=android&dev=true"
                val t0 = System.nanoTime()
                try {
                    val connection = URL(urlString).openConnection() as HttpURLConnection
                    connection.connectTimeout = 5_000
                    connection.readTimeout = 5_000
                    connection.requestMethod = "GET"
                    try {
                        val code = connection.responseCode
                        if (code !in 200..299) {
                            Log.e(TAG, "Metro HTTP $code for $urlString")
                            return@withContext null
                        }
                        val body = connection.inputStream.bufferedReader().use { it.readText() }
                        if (BuildConfig.DEBUG) {
                            Log.i(
                                TAG,
                                "[perf] metro fetch: ${"%.2f".format(
                                    (System.nanoTime() - t0) / 1_000_000.0,
                                )} ms (${body.length} chars)",
                            )
                        }
                        body
                    } finally {
                        connection.disconnect()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Metro fetch failed ($urlString): ${e.message}")
                    null
                }
            }

        /**
         * Read the release bundle baked into the app's assets by the Gradle bundling task
         * (assets/voltra/voltra-widget-<id>.bundle). The release counterpart of [fetchDevBundle];
         * returns null (→ prerendered fallback) when the asset is missing.
         */
        private fun loadBakedBundle(
            context: Context,
            widgetId: String,
        ): String? =
            try {
                context.assets
                    .open("voltra/voltra-widget-$widgetId.bundle")
                    .bufferedReader()
                    .use { it.readText() }
            } catch (e: java.io.IOException) {
                Log.w(TAG, "No baked bundle for widgetId=$widgetId (assets/voltra/voltra-widget-$widgetId.bundle)")
                null
            }

        private fun isDev(context: Context): Boolean =
            (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

        /**
         * Build the WidgetEnvironment JSON (see packages/core/src/widget-environment.ts) for the
         * current render.
         */
        private fun buildEnvJson(
            context: Context,
            size: DpSize,
            configuration: Map<String, String>,
        ): String {
            val family = "${size.width.value.toInt()}x${size.height.value.toInt()}"
            val nightMode =
                context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            val colorScheme = if (nightMode == Configuration.UI_MODE_NIGHT_YES) "dark" else "light"
            val locale =
                context.resources.configuration.locales[0]
                    .toLanguageTag()
            val dev = isDev(context)
            val appVersion =
                try {
                    context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "unknown"
                } catch (e: Exception) {
                    "unknown"
                }

            val build =
                JSONObject()
                    .put("isDev", dev)
                    .put(
                        "metroUrl",
                        if (dev) "http://${AndroidInfoHelpers.getServerHost(context)}" else JSONObject.NULL,
                    ).put("appVersion", appVersion)
                    .put("voltraVersion", BuildConfig.VOLTRA_VERSION)

            val configObject = JSONObject()
            configuration.forEach { (key, value) -> configObject.put(key, value) }

            return JSONObject()
                .put("date", System.currentTimeMillis())
                .put("widgetFamily", family)
                .put("colorScheme", colorScheme)
                .put("locale", locale)
                .put("configuration", configObject)
                .put("build", build)
                .toString()
        }
    }

    // One node is rendered for the actual on-screen size (env carries the size); no multi-variant
    // selection on the client path. SizeMode.Exact re-composes provideGlance with the real
    // LocalSize on every resize, so env.widgetFamily and the node track the new size.
    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(
        context: Context,
        id: GlanceId,
    ) {
        val source = if (isDev(context)) fetchDevBundle(context, widgetId) else loadBakedBundle(context, widgetId)
        val bundleReady = source != null && VoltraJSRenderer.evaluateBundle(source, widgetId)
        if (!bundleReady) {
            Log.w(TAG, "Bundle not ready for widgetId=$widgetId (dev=${isDev(context)})")
        }

        // Read user-configured params (DataStore) off the composition so env.configuration is
        // available synchronously during render.
        val appWidgetId =
            runCatching { GlanceAppWidgetManager(context).getAppWidgetId(id) }
                .onFailure { e ->
                    Log.w(
                        TAG,
                        "Failed to resolve appWidgetId for widgetId=$widgetId, glanceId=$id: ${e.message}. " +
                            "Falling back to widget-type configuration only (no instance layer).",
                    )
                }.getOrNull()
        val configuration = VoltraConfigurationStore(context).get(widgetId, appWidgetId)

        provideContent {
            Content(bundleReady, configuration)
        }
    }

    @Composable
    private fun Content(
        bundleReady: Boolean,
        configuration: Map<String, String>,
    ) {
        val context = LocalContext.current
        val size = LocalSize.current

        // Live render when the bundle is ready; otherwise fall back to the plugin-prerendered
        // placeholder node (first paint / offline / Metro down).
        val node = (if (bundleReady) renderNode(context, size, configuration) else null) ?: placeholderNode(context)
        if (node != null) {
            GlanceFactory(widgetId, null, null, size).Render(node)
        } else {
            Fallback()
        }
    }

    private fun renderNode(
        context: Context,
        size: DpSize,
        configuration: Map<String, String>,
    ): VoltraNode? {
        val envJson = buildEnvJson(context, size, configuration)
        val resolved = VoltraJSRenderer.render(widgetId, "{}", envJson) ?: return null
        return parseNode(resolved)
    }

    /** Decode the plugin-prerendered single-node placeholder from the initial-states asset. */
    private fun placeholderNode(context: Context): VoltraNode? {
        val raw = VoltraWidgetManager(context).readWidgetJson(widgetId) ?: return null
        return parseNode(raw)
    }

    private fun parseNode(jsonString: String): VoltraNode? =
        try {
            val t0 = System.nanoTime()
            val node = VoltraDecompressor.decompressNode(json.decodeFromString<VoltraNode>(jsonString))
            if (BuildConfig.DEBUG) {
                Log.i(
                    TAG,
                    "[perf] decode+decompress: ${"%.2f".format(
                        (System.nanoTime() - t0) / 1_000_000.0,
                    )} ms (${jsonString.length} chars)",
                )
            }
            node
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse node for widgetId=$widgetId: ${e.message}")
            null
        }

    @Composable
    private fun Fallback() {
        Box(
            modifier = GlanceModifier.fillMaxSize().padding(16.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = "Loading…", style = androidx.glance.text.TextStyle(color = ColorProvider(Color.Gray)))
        }
    }
}
