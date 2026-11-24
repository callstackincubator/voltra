package voltra.dynamicwidget

import android.content.Context
import android.content.res.Configuration
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.Action
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.unit.ColorProvider
import com.facebook.react.modules.systeminfo.AndroidInfoHelpers
import kotlinx.serialization.json.Json
import org.json.JSONObject
import voltra.BuildConfig
import voltra.glance.GlanceFactory
import voltra.models.VoltraNode
import voltra.parsing.VoltraDecompressor
import voltra.widget.server.WidgetCanonicalConfiguration
import voltra.widget.server.WidgetScope

/**
 * Client-rendered Voltra widget: downloads a per-widget JS bundle (Metro in dev), evaluates it
 * in the standalone Hermes runtime, and invokes its `render(props, env)` on every Glance render
 * — the Android counterpart of iOS's VoltraClientWidgetProvider.
 *
 * Pipeline:
 *  1. provideGlance (suspend, off the composition): fetch the bundle from Metro and evaluate it
 *     via [DynamicWidgetBundleLoader.load].
 *  2. Content (composable): read LocalSize/locale/scheme, build the WidgetEnvironment JSON, call
 *     [VoltraJSRenderer.render], decompress the resulting node, and hand it to [GlanceFactory] —
 *     the same renderer server-rendered widgets use, so the two look identical.
 *
 * On fetch/eval/render failure a debuggable build shows the dev error view and a release build
 * keeps the placement's last good render, falling back to the config plugin's prerendered
 * placeholder and then a minimal "Loading…" box (ADR 0013).
 */
class VoltraClientGlanceWidget(
    private val widgetId: String = "default",
    private val environmentSource: DynamicWidgetEnvironmentSource? = null,
) : GlanceAppWidget() {
    companion object {
        private const val TAG = "VoltraClientGlanceWidget"

        private val json =
            Json {
                ignoreUnknownKeys = true
                explicitNulls = false
            }

        /**
         * The scope a placement renders, fetches and reads its status at.
         *
         * Normally the instance of its merged configuration (ADR 0007). When Glance cannot tell us
         * which placement is being rendered, [dynamicWidgetAppWidgetId] is null and the caller has
         * already degraded to the widget-type configuration — which may name an instance no
         * placement has, whose props slot and status record nothing ever writes. The widget scope
         * is the honest answer there: it is what the pre-ADR-0007 render used, the props store
         * falls back to it anyway, and the status store has no fallback of its own.
         */
        internal fun placementScope(
            widgetId: String,
            configuration: Map<String, String>,
            dynamicWidgetAppWidgetId: Int?,
        ): WidgetScope =
            if (dynamicWidgetAppWidgetId == null) {
                WidgetScope.of(widgetId)
            } else {
                WidgetScope.of(widgetId, configuration)
            }

        /**
         * The env a trial render runs with: the real theme, locale and configuration, and a size
         * the caller picked from the widget's placements.
         *
         * `env.serverUpdate` is deliberately absent. The trial is asking whether the props render,
         * and a widget that only fails when it is told the fetch went badly is a different problem
         * from props that cannot be drawn.
         */
        internal fun buildTrialEnvJson(
            context: Context,
            widgetId: String,
            size: DpSize,
            configuration: Map<String, String>,
        ): String = buildEnvJson(context, widgetId, size, configuration, environmentSource = null)

        /** `env.widgetFamily` for a size, and the key the last good render is kept under. */
        internal fun widgetFamily(size: DpSize): String = "${size.width.value.toInt()}x${size.height.value.toInt()}"

        /**
         * Build the WidgetEnvironment JSON (see packages/core/src/widget-environment.ts) for the
         * current render.
         */
        private fun buildEnvJson(
            context: Context,
            widgetId: String,
            size: DpSize,
            configuration: Map<String, String>,
            environmentSource: DynamicWidgetEnvironmentSource?,
        ): String {
            val family = widgetFamily(size)
            val nightMode =
                context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            val colorScheme = if (nightMode == Configuration.UI_MODE_NIGHT_YES) "dark" else "light"
            val dev = isDynamicWidgetDev(context)
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

            val env =
                JSONObject()
                    .put("date", System.currentTimeMillis())
                    .put("widgetFamily", family)
                    .put("colorScheme", colorScheme)
                    .put("configuration", configObject)
                    .put("build", build)

            // Locale, preferred languages, 12/24-hour, direction, time zone and regional formats
            // (ADR 0009 §1). `locale` keeps its BCP-47 `toLanguageTag()` form.
            DynamicWidgetLocaleEnvironment.capture(context).putInto(env)

            // The instance key (ADR 0007): the hash of this placement's merged configuration, or
            // absent for a widget with no configuration parameters at all — matching what the
            // request builder sends and what WidgetScope.of(widgetId, configuration) resolves to.
            WidgetCanonicalConfiguration.key(configuration)?.let { instanceKey ->
                env.put("instance", instanceKey)
            }

            // Whatever drives this widget's props gets to describe itself. A plain Dynamic Widget
            // has no source and its env is exactly what it was before ADR 0002. The scope carries
            // the instance key (ADR 0007), so a server-driven source can report the fetch status of
            // the instance actually being rendered rather than the widget as a whole.
            val scope = WidgetScope.of(widgetId, configuration)
            environmentSource?.environmentFields(context, scope)?.forEach { (key, value) ->
                env.put(key, value)
            }

            return env.toString()
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
        // The result goes into a process-wide record the composition reads on every pass, not into
        // a value captured here: Glance does not re-run provideGlance for a live session, so a
        // captured "bundle not ready" would outlive the Metro outage that caused it (ADR 0013).
        val bundleState = DynamicWidgetBundleLoader.load(context, widgetId)
        if (bundleState is DynamicWidgetBundleState.Failed) {
            Log.w(
                TAG,
                "Bundle not ready for widgetId=$widgetId (dev=${isDynamicWidgetDev(
                    context,
                )}): ${bundleState.failure.message}",
            )
        }

        // Which placement is being rendered, so env.configuration carries this placement's own
        // values rather than the widget-type ones (ADR 0006). A Glance edge case where the id
        // cannot be mapped degrades to the pre-instance behaviour instead of a blank widget.
        val appWidgetId =
            try {
                GlanceAppWidgetManager(context).getAppWidgetId(id)
            } catch (e: Exception) {
                Log.w(
                    TAG,
                    "Could not resolve the appWidgetId for widgetId=$widgetId; rendering the " +
                        "widget-type configuration: ${e.message}",
                )
                null
            }

        // Read user-configured params (DataStore) off the composition so env.configuration is
        // available synchronously during the first render of this session. Later writes reach the
        // composition through the configuration revision, not through this value: Glance does not
        // re-run provideGlance for a widget whose session is still alive.
        val configuration = VoltraConfigurationStore(context).get(widgetId, appWidgetId)

        provideContent {
            Content(configuration, appWidgetId)
        }
    }

    @Composable
    private fun Content(
        initialConfiguration: Map<String, String>,
        appWidgetId: Int?,
    ) {
        val context = LocalContext.current
        val size = LocalSize.current
        val configuration =
            currentDynamicWidgetConfiguration(
                context = context,
                dynamicWidgetId = widgetId,
                dynamicWidgetAppWidgetId = appWidgetId,
                initialConfiguration = initialConfiguration,
            )
        // This placement's scope (ADR 0007): an Instance of its merged configuration, or the plain
        // Widget scope when it has none — which is also every widget's scope before this ADR. The
        // render input, the env fields and the refresh button all take this one value, so a tap
        // cannot refresh something other than what is on screen.
        val scope = placementScope(widgetId, configuration, appWidgetId)
        val dynamicWidgetRenderInput = currentDynamicWidgetRenderInput(context, widgetId, scope)

        val lastGoodStore = remember { DynamicWidgetLastGoodStore(context) }
        // The prerendered placeholder covers first paint and a release widget that never rendered.
        val shown =
            resolveDynamicWidgetContent(
                widgetId = widgetId,
                appWidgetId = appWidgetId,
                family = widgetFamily(size),
                isDev = isDynamicWidgetDev(context),
                bundleState = DynamicWidgetBundleRecord.get(widgetId),
                render = { renderNode(context, size, configuration, appWidgetId, dynamicWidgetRenderInput) },
                lastGoodStore = lastGoodStore,
                parseNode = ::parseNode,
                placeholder = { placeholderNode(context) },
            )
        when (shown) {
            is DynamicWidgetShownContent.Node -> GlanceFactory(widgetId, null, null, size).Render(shown.node)
            is DynamicWidgetShownContent.DevError -> DynamicWidgetDevErrorView(widgetId, shown.failure)
            is DynamicWidgetShownContent.Loading -> Fallback()
        }

        // Drawn over the widget's own content, so an entry does not have to leave room for it.
        // Only a server-driven widget configured with `refresh: true` has a source that offers one.
        environmentSource?.refreshAction(context, scope)?.let { action ->
            RefreshButton(action)
        }
    }

    /**
     * The same overlay the payload engine draws, so the two engines' refresh buttons look and sit
     * identically. Tapping it enqueues a fetch rather than running one inline: the tap then
     * survives a moment without connectivity instead of failing silently.
     */
    @Composable
    private fun RefreshButton(action: Action) {
        Box(
            modifier = GlanceModifier.fillMaxSize().padding(12.dp),
            contentAlignment = Alignment.TopEnd,
        ) {
            Box(
                modifier =
                    GlanceModifier
                        .size(28.dp)
                        .cornerRadius(14.dp)
                        .background(
                            androidx.glance.color.ColorProvider(
                                day = Color(0x32787880),
                                night = Color(0x32787880),
                            ),
                        ).clickable(action),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "↻",
                    style =
                        androidx.glance.text.TextStyle(
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                            color =
                                androidx.glance.color.ColorProvider(
                                    day = Color(0x993C3C43),
                                    night = Color(0x99EBEBF5),
                                ),
                        ),
                )
            }
        }
    }

    private fun renderNode(
        context: Context,
        size: DpSize,
        configuration: Map<String, String>,
        appWidgetId: Int?,
        dynamicWidgetRenderInput: DynamicWidgetRenderInput,
    ): DynamicWidgetRenderOutcome {
        val envJson = buildEnvJson(context, widgetId, size, configuration, environmentSource)
        val dynamicWidgetRenderCoordinator = DynamicWidgetRenderCoordinator()
        val outcome =
            dynamicWidgetRenderCoordinator.renderDynamicWidget(
                dynamicWidgetId = widgetId,
                dynamicWidgetRenderInput = dynamicWidgetRenderInput,
                dynamicWidgetEnvironmentJson = envJson,
            )
        if (outcome is DynamicWidgetRenderOutcome.Success) {
            DynamicWidgetTimelineAlarm.schedule(context, widgetId, appWidgetId, dynamicWidgetRenderInput.propsJson)
        }
        return outcome
    }

    /**
     * Decode the plugin-prerendered single-node placeholder from the initial-states asset.
     * Dynamic Widgets never read payload state (ADR 0000), so this goes through
     * [DynamicWidgetPlaceholderStore] rather than the payload-owning [VoltraWidgetManager].
     */
    private fun placeholderNode(context: Context): VoltraNode? {
        val raw = DynamicWidgetPlaceholderStore(context).readPlaceholderJson(widgetId) ?: return null
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
