package voltra

import android.appwidget.AppWidgetHostView
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

/**
 * Whether [VoltraRN] should host the composed RemoteViews in an [AppWidgetHostView] rather
 * than apply()/reapply() them directly onto the RN FrameLayout.
 *
 * This is true from API 32 (Android 12L) because that's where Glance embeds a lazy list's
 * items in-process, so an AppWidgetHostView with no attached AppWidgetProviderInfo is enough
 * to make setRemoteAdapter actions work. Below API 32, AppWidgetHostView.getRemoteContext()
 * dereferences its AppWidgetProviderInfo with no null guard — the catch that falls back to the
 * app's own context was only added in API 32 — so without a real AppWidgetProviderInfo (which
 * a preview has no way to obtain) updateAppWidget throws and every preview renders blank. Below
 * this level we fall back to the previous apply()/reapply() path; lazy lists get their own
 * eager-rendering fallback there instead (see VoltraLazyColumn/VoltraLazyVerticalGrid).
 */
internal fun usesAppWidgetHostView(sdkInt: Int): Boolean = sdkInt >= Build.VERSION_CODES.S_V2

/** An [AppWidgetHostView] that records whether it fell back to its error view. */
private class PreviewAppWidgetHostView(
    context: Context,
) : AppWidgetHostView(context) {
    var showedErrorView = false
        private set

    override fun getErrorView(): View {
        showedErrorView = true
        return super.getErrorView()
    }
}

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
                            if (usesAppWidgetHostView(Build.VERSION.SDK_INT)) {
                                // Host the composed RemoteViews in an AppWidgetHostView instead
                                // of manually apply()/reapply()-ing them onto this FrameLayout.
                                // AppWidgetHostView.updateAppWidget already handles
                                // recycle-vs-inflate, LayoutParams, and error views for us, and
                                // (from API 32) satisfies the setRemoteAdapter action that Glance
                                // compiles LazyColumn/LazyVerticalGrid to — see
                                // usesAppWidgetHostView for why this only runs from API 32.
                                //
                                // IMPORTANT: updateAppWidget recycles the existing view whenever
                                // remoteViews.canRecycleView(...) is true (same root layout id),
                                // which is normally desirable to avoid flicker. But across two
                                // different Voltra payloads that happen to compile to the same
                                // root layout, recycling can leave stale styles behind (e.g.
                                // padding from the previous widget persisting because the new
                                // RemoteViews doesn't explicitly reset it to zero). So force a
                                // fresh AppWidgetHostView whenever the payload itself changed,
                                // and only reuse the existing host view for dimension-only
                                // re-renders of the same payload.
                                val reusableHostView =
                                    host.currentHostView()?.takeIf { payloadStr == lastRenderedPayload }
                                if (reusableHostView != null) {
                                    reusableHostView.updateAppWidget(remoteViews)
                                } else {
                                    val freshHostView = PreviewAppWidgetHostView(remoteViewsContext)
                                    freshHostView.layoutParams =
                                        ViewGroup.LayoutParams(
                                            ViewGroup.LayoutParams.MATCH_PARENT,
                                            ViewGroup.LayoutParams.MATCH_PARENT,
                                        )

                                    // Render into the new host view before it replaces anything.
                                    // updateAppWidget swallows inflation failures and shows its
                                    // own error view instead, so check for that and keep the
                                    // last good render on screen, as the path below API 32 does.
                                    freshHostView.updateAppWidget(remoteViews)
                                    if (freshHostView.showedErrorView) return@withContext

                                    // Add the new host view FIRST, then remove old ones, to prevent flickering.
                                    host.addView(freshHostView)

                                    val childCount = host.childCount
                                    if (childCount > 1) {
                                        host.removeViews(0, childCount - 1)
                                    }
                                }
                            } else {
                                // Below API 32, AppWidgetHostView can't be used at all (see
                                // usesAppWidgetHostView), so apply/reapply the RemoteViews
                                // directly onto this FrameLayout as before.
                                //
                                // Try to reapply to the existing view first to avoid
                                // flickering/replacing. IMPORTANT: Only use reapply for
                                // dimension-only changes (same payload). When the payload
                                // changes, always do a fresh apply to prevent stale style bleed
                                // (e.g. padding from a previous widget persisting because the
                                // new widget's RemoteViews doesn't explicitly reset it to zero).
                                var applied = false
                                if (host.childCount > 0 && payloadStr == lastRenderedPayload) {
                                    try {
                                        val existingView = host.getChildAt(0)
                                        remoteViews.reapply(remoteViewsContext, existingView)
                                        applied = true
                                    } catch (e: Exception) {
                                    }
                                }

                                if (!applied) {
                                    // Inflate with parent to ensure correct LayoutParams, but don't attach yet
                                    val inflatedView = remoteViews.apply(remoteViewsContext, host)

                                    // Add new view FIRST, then remove old ones to prevent flickering
                                    host.addView(inflatedView)

                                    val childCount = host.childCount
                                    if (childCount > 1) {
                                        host.removeViews(0, childCount - 1)
                                    }
                                }
                            }

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
