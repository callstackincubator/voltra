package voltra.glance.components

import android.appwidget.AppWidgetHostView
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.FrameLayout
import android.widget.TextView
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.ExperimentalGlanceRemoteViewsApi
import androidx.glance.appwidget.GlanceRemoteViews
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import voltra.glance.GlanceFactory
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.payload.ComponentTypeID

/**
 * Composes LazyColumn / LazyVerticalGrid the way VoltraWidgetPreview does (GlanceRemoteViews
 * with `isPreview = true`) and inflates the result, to check the preview actually shows the
 * list's items.
 */
@OptIn(ExperimentalGlanceRemoteViewsApi::class)
@RunWith(RobolectricTestRunner::class)
class VoltraLazyListPreviewRenderTest {
    private val context = RuntimeEnvironment.getApplication()
    private val size = DpSize(300.dp, 400.dp)
    private val itemTexts = (1..12).map { "Item $it" }

    @Test
    @Config(sdk = [31])
    fun `renders every LazyColumn item eagerly and full width on API 31`() {
        val root = inflate(lazyColumn(style = mapOf("width" to "100%")), FrameLayout(context))
        layout(root)

        assertTrue("expected no AdapterView in the fallback", findAll<AdapterView<*>>(root).isEmpty())
        val textViews = findAll<TextView>(root)
        assertEquals(itemTexts, textViews.map { it.text.toString() })
        // Like Glance's own list items, every item's container spans the whole list, even once
        // the list is long enough (more than 10 items) to need nested groups.
        textViews.forEach { textView ->
            assertEquals("container width of ${textView.text}", root.width, (textView.parent as View).width)
        }
    }

    @Test
    @Config(sdk = [31])
    fun `renders every LazyVerticalGrid item eagerly in equal-width cells on API 31`() {
        val grid = element(ComponentTypeID.LAZY_VERTICAL_GRID, mapOf("columns" to 5, "s" to mapOf("width" to "100%")))
        val root = inflate(grid, FrameLayout(context))
        layout(root)

        assertTrue("expected no AdapterView in the fallback", findAll<AdapterView<*>>(root).isEmpty())
        val textViews = findAll<TextView>(root)
        assertEquals(itemTexts, textViews.map { it.text.toString() })
        val cellWidths = textViews.map { (it.parent as View).width }.toSet()
        assertEquals("cell widths $cellWidths", 1, cellWidths.size)
        assertEquals(root.width / 5f, cellWidths.single().toFloat(), 2f)
    }

    @Test
    @Config(sdk = [34])
    fun `renders LazyColumn as a real list only when inflated into an AppWidgetHostView from API 32`() {
        // AppWidgetHostView.updateAppWidget inflates with `this` as the parent, but Robolectric
        // shadows updateAppWidget, so inflate into the host view the same way directly.
        val hostedList = findAll<AdapterView<*>>(inflate(lazyColumn(), AppWidgetHostView(context))).singleOrNull()
        assertNotNull("expected the lazy list to inflate as an AdapterView", hostedList)
        assertEquals(itemTexts.size, hostedList!!.adapter?.count)

        // Outside an AppWidgetHostView, as the preview used to inflate, the list stays empty.
        val unhostedList = findAll<AdapterView<*>>(inflate(lazyColumn(), FrameLayout(context))).single()
        assertNull(unhostedList.adapter)
    }

    private fun lazyColumn(style: Map<String, Any?>? = null) =
        element(ComponentTypeID.LAZY_COLUMN, style?.let { mapOf("s" to it) })

    private fun element(
        type: Int,
        props: Map<String, Any?>?,
    ): VoltraNode =
        VoltraNode.Element(
            VoltraElement(
                t = type,
                p = props,
                c =
                    VoltraNode.Array(
                        itemTexts.map {
                            VoltraNode.Element(VoltraElement(t = ComponentTypeID.TEXT, c = VoltraNode.Text(it)))
                        },
                    ),
            ),
        )

    private fun compose(node: VoltraNode) =
        runBlocking {
            val factory = GlanceFactory("preview-test", widgetSize = size, isPreview = true)
            GlanceRemoteViews().compose(context, size) { factory.Render(node) }.remoteViews
        }

    private fun inflate(
        node: VoltraNode,
        parent: ViewGroup,
    ): View = compose(node).apply(context, parent)

    private fun layout(view: View) {
        val density = context.resources.displayMetrics.density
        val widthPx = (size.width.value * density).toInt()
        // Tall enough for every item, so none is laid out at zero size.
        val heightPx = 10_000
        view.measure(
            View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(heightPx, View.MeasureSpec.EXACTLY),
        )
        view.layout(0, 0, widthPx, heightPx)
    }

    private inline fun <reified T : View> findAll(view: View): List<T> = descendantsOf(view).filterIsInstance<T>()

    private fun descendantsOf(view: View): List<View> =
        listOf(view) +
            if (view is ViewGroup) {
                (0 until view.childCount).flatMap {
                    descendantsOf(
                        view.getChildAt(it),
                    )
                }
            } else {
                emptyList()
            }
}
