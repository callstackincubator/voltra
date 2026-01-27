package voltra

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.ExperimentalGlanceRemoteViewsApi
import androidx.glance.appwidget.GlanceRemoteViews
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import kotlinx.coroutines.*
import voltra.glance.GlanceFactory
import voltra.parsing.VoltraPayloadParser
import kotlin.math.abs

@OptIn(ExperimentalGlanceRemoteViewsApi::class)
class VoltraRN(
    context: Context,
    appContext: AppContext,
) : ExpoView(context, appContext) {
    private var mainScope: CoroutineScope? = null
    private val frameLayout = FrameLayout(context)
    private var viewId: String? = null
    private var payload: String? = null
    private var updateJob: Job? = null

    private var lastRenderedPayload: String? = null
    private var lastRenderedWidthDp: Float = 0f
    private var lastRenderedHeightDp: Float = 0f

    init {
        // Ensure FrameLayout takes full space
        frameLayout.layoutParams =
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        addView(frameLayout)
    }

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

    private fun updateView() {
        val payloadStr = payload ?: return
        val id = viewId ?: return

        val density = context.resources.displayMetrics.density
        val widthDp = frameLayout.width.toFloat() / density
        val heightDp = frameLayout.height.toFloat() / density

        // Avoid redundant updates if nothing significant changed and we already have a view
        if (frameLayout.childCount > 0 &&
            payloadStr == lastRenderedPayload &&
            abs(widthDp - lastRenderedWidthDp) < 1.0f &&
            abs(heightDp - lastRenderedHeightDp) < 1.0f
        ) {
            return
        }

        updateJob?.cancel()
        updateJob =
            mainScope?.launch {
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
                        frameLayout.removeAllViews()
                        return@launch
                    }

                    // Determine size for Glance composition.
                    // Glance needs a non-zero size. If we don't have one yet, use a fallback.
                    val composeSize =
                        if (widthDp > 1f && heightDp > 1f) {
                            DpSize(widthDp.dp, heightDp.dp)
                        } else {
                            DpSize(300.dp, 200.dp)
                        }

                    val glanceRemoteViews = GlanceRemoteViews()
                    val factory = GlanceFactory(id, voltraPayload.e, voltraPayload.s)

                    val result =
                        withContext(Dispatchers.Default) {
                            glanceRemoteViews.compose(context, composeSize) {
                                factory.Render(node)
                            }
                        }

                    ensureActive()

                    val remoteViews = result.remoteViews

                    withContext(Dispatchers.Main) {
                        try {
                            // Try to reapply to the existing view first to avoid flickering/replacing
                            var applied = false
                            if (frameLayout.childCount > 0) {
                                try {
                                    val existingView = frameLayout.getChildAt(0)
                                    remoteViews.reapply(context, existingView)
                                    applied = true
                                    // Update tracking state
                                    lastRenderedPayload = payloadStr
                                    lastRenderedWidthDp = widthDp
                                    lastRenderedHeightDp = heightDp
                                } catch (e: Exception) {
                                }
                            }

                            if (!applied) {
                                // Inflate with parent to ensure correct LayoutParams, but don't attach yet
                                val inflatedView = remoteViews.apply(context, frameLayout)

                                // Add new view FIRST, then remove old ones to prevent flickering
                                frameLayout.addView(inflatedView)

                                val childCount = frameLayout.childCount
                                if (childCount > 1) {
                                    frameLayout.removeViews(0, childCount - 1)
                                }

                                // CRITICAL FIX: Manually trigger layout for the new content.
                                // Since we are adding this async, the parent won't do it for us automatically.
                                frameLayout.measure(
                                    View.MeasureSpec.makeMeasureSpec(frameLayout.width, View.MeasureSpec.EXACTLY),
                                    View.MeasureSpec.makeMeasureSpec(frameLayout.height, View.MeasureSpec.EXACTLY),
                                )
                                frameLayout.layout(
                                    frameLayout.left,
                                    frameLayout.top,
                                    frameLayout.right,
                                    frameLayout.bottom,
                                )

                                // Update tracking state
                                lastRenderedPayload = payloadStr
                                lastRenderedWidthDp = widthDp
                                lastRenderedHeightDp = heightDp
                            }
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
