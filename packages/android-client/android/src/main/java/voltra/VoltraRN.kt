package voltra

import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProviderInfo
import android.content.Context
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.ExperimentalGlanceRemoteViewsApi
import androidx.glance.appwidget.GlanceRemoteViews
import kotlinx.coroutines.*
import voltra.glance.GlanceFactory
import voltra.parsing.VoltraPayloadParser
import kotlin.math.abs

@OptIn(ExperimentalGlanceRemoteViewsApi::class)
class VoltraRN(
    context: Context,
) : FrameLayout(context) {
    private var mainScope: CoroutineScope? = null
    private var viewId: String? = null
    private var payload: String? = null
    private var updateJob: Job? = null

    private var lastRenderedPayload: String? = null
    private var lastRenderedWidthDp: Float = 0f
    private var lastRenderedHeightDp: Float = 0f

    // One of this app's own AppWidgetProviderInfo entries, used only to silence the "Error
    // trying to create the remote context" log that AppWidgetHostView emits without one.
    // Resolved lazily and cached; absence is harmless (see resolveOwnProviderInfo).
    private var providerInfoResolved = false
    private var providerInfo: AppWidgetProviderInfo? = null

    fun setViewId(id: String) {
        if (this.viewId == id) return
        this.viewId = id
        updateView()
    }

    fun setPayload(payload: String) {
        if (this.payload == payload) return
        this.payload = payload
        updateView()
    }

    private fun currentHostView(): AppWidgetHostView? = getChildAt(0) as? AppWidgetHostView

    /**
     * Looks up an [AppWidgetProviderInfo] belonging to this app, if any, purely so it can be
     * handed to [AppWidgetHostView.setAppWidget]. That call is optional: without it,
     * AppWidgetHostView still renders the composed RemoteViews correctly, it just logs a
     * cosmetic "Error trying to create the remote context" and falls back to the app's own
     * context. `getInstalledProvidersForPackage` needs API 26+; apps with no AppWidget
     * provider of their own simply skip this.
     */
    private fun resolveOwnProviderInfo(): AppWidgetProviderInfo? {
        if (providerInfoResolved) return providerInfo
        providerInfoResolved = true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            providerInfo =
                try {
                    AppWidgetManager
                        .getInstance(context)
                        .getInstalledProvidersForPackage(context.packageName, null)
                        .firstOrNull()
                } catch (e: Exception) {
                    null
                }
        }
        return providerInfo
    }

    private fun updateView() {
        val payloadStr = payload ?: return
        val id = viewId ?: return

        val density = context.resources.displayMetrics.density
        val widthDp = this.width.toFloat() / density
        val heightDp = this.height.toFloat() / density

        // Don't render until we have real dimensions from layout.
        // onLayout() will call updateView() once dimensions are available.
        if (widthDp <= 1f || heightDp <= 1f) return

        // Avoid redundant updates if nothing significant changed and we already have a view
        if (this.childCount > 0 &&
            payloadStr == lastRenderedPayload &&
            abs(widthDp - lastRenderedWidthDp) < 1.0f &&
            abs(heightDp - lastRenderedHeightDp) < 1.0f
        ) {
            return
        }

        updateJob?.cancel()
        updateJob =
            mainScope?.launch {
                val host = this@VoltraRN
                try {
                    // Parse payload on background thread
                    val voltraPayload =
                        withContext(Dispatchers.Default) {
                            try {
                                VoltraPayloadParser.parse(payloadStr)
                            } catch (e: Exception) {
                                null
                            }
                        } ?: return@launch

                    val node =
                        voltraPayload.collapsed
                            ?: voltraPayload.expanded
                            ?: voltraPayload.variants?.get("content")
                            ?: voltraPayload.variants?.values?.firstOrNull()

                    if (node == null) {
                        host.removeAllViews()
                        return@launch
                    }

                    val composeSize = DpSize(widthDp.dp, heightDp.dp)
                    val remoteViewsContext = context.applicationContext

                    val glanceRemoteViews = GlanceRemoteViews()
                    val factory = GlanceFactory(id, voltraPayload.e, voltraPayload.s, composeSize, isPreview = true)

                    val result =
                        withContext(Dispatchers.Default) {
                            glanceRemoteViews.compose(remoteViewsContext, composeSize) {
                                factory.Render(node)
                            }
                        }

                    ensureActive()

                    val remoteViews = result.remoteViews

                    // Check if the frameLayout dimensions have changed since we started composing.
                    // If so, skip this render — a new updateView() will be triggered by onLayout.
                    val currentWidthDp = host.width.toFloat() / density
                    val currentHeightDp = host.height.toFloat() / density
                    if (abs(currentWidthDp - widthDp) >= 1.0f || abs(currentHeightDp - heightDp) >= 1.0f) {
                        return@launch
                    }

                    withContext(Dispatchers.Main) {
                        try {
                            // Host the composed RemoteViews in an AppWidgetHostView instead of
                            // manually apply()/reapply()-ing them onto this FrameLayout. Glance
                            // compiles LazyColumn/LazyVerticalGrid to a setRemoteAdapter action,
                            // and on API 31 and below RemoteViews.apply refuses to run it unless
                            // the inflation root parent is an AppWidgetHostView — see the
                            // eager-rendering fallback in VoltraLazyColumn/VoltraLazyVerticalGrid
                            // for versions where that's still not enough.
                            // AppWidgetHostView.updateAppWidget already handles recycle-vs-inflate,
                            // LayoutParams, and error views for us.
                            //
                            // IMPORTANT: updateAppWidget recycles the existing view whenever
                            // remoteViews.canRecycleView(...) is true (same root layout id), which
                            // is normally desirable to avoid flicker. But across two different
                            // Voltra payloads that happen to compile to the same root layout,
                            // recycling can leave stale styles behind (e.g. padding from the
                            // previous widget persisting because the new RemoteViews doesn't
                            // explicitly reset it to zero). So force a fresh AppWidgetHostView
                            // whenever the payload itself changed, and only reuse the existing
                            // host view for dimension-only re-renders of the same payload.
                            val reusableHostView =
                                host.currentHostView()?.takeIf { payloadStr == lastRenderedPayload }
                            val targetHostView =
                                reusableHostView ?: run {
                                    val freshHostView = AppWidgetHostView(remoteViewsContext)
                                    host.resolveOwnProviderInfo()?.let { info ->
                                        freshHostView.setAppWidget(AppWidgetManager.INVALID_APPWIDGET_ID, info)
                                    }
                                    freshHostView.layoutParams =
                                        ViewGroup.LayoutParams(
                                            ViewGroup.LayoutParams.MATCH_PARENT,
                                            ViewGroup.LayoutParams.MATCH_PARENT,
                                        )

                                    // Add the new host view FIRST, then remove old ones, to prevent flickering.
                                    host.addView(freshHostView)

                                    val childCount = host.childCount
                                    if (childCount > 1) {
                                        host.removeViews(0, childCount - 1)
                                    }

                                    freshHostView
                                }

                            targetHostView.updateAppWidget(remoteViews)

                            // Always re-measure and re-layout after applying RemoteViews.
                            // This is critical because:
                            // 1) After adding a fresh host view: it was added asynchronously so
                            //    the parent won't trigger layout automatically.
                            // 2) After updating the existing host view: text content or styles may
                            //    have changed, requiring re-measurement to avoid stale layout
                            //    constraints (e.g. truncated text).
                            host.measure(
                                View.MeasureSpec.makeMeasureSpec(host.width, View.MeasureSpec.EXACTLY),
                                View.MeasureSpec.makeMeasureSpec(host.height, View.MeasureSpec.EXACTLY),
                            )
                            host.layout(
                                host.left,
                                host.top,
                                host.right,
                                host.bottom,
                            )

                            // Update tracking state
                            lastRenderedPayload = payloadStr
                            lastRenderedWidthDp = widthDp
                            lastRenderedHeightDp = heightDp
                        } catch (e: Exception) {
                        }
                    }
                } catch (e: CancellationException) {
                } catch (e: Exception) {
                }
            }
    }

    override fun onLayout(
        changed: Boolean,
        left: Int,
        top: Int,
        right: Int,
        bottom: Int,
    ) {
        super.onLayout(changed, left, top, right, bottom)
        if (changed) {
            val w = right - left
            val h = bottom - top
            // Only trigger update if we actually have a size now
            if (w > 0 && h > 0) {
                updateView()
            }
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
        updateView()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        updateJob?.cancel()
        mainScope?.cancel()
        mainScope = null
    }
}
