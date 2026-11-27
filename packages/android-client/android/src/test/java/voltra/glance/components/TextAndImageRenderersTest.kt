package voltra.glance.components

import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.ExperimentalGlanceRemoteViewsApi
import androidx.glance.appwidget.GlanceRemoteViews
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.glance.GlanceFactory
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.payload.ComponentTypeID

@OptIn(ExperimentalGlanceRemoteViewsApi::class)
@RunWith(RobolectricTestRunner::class)
class TextAndImageRenderersTest {
    private val context = RuntimeEnvironment.getApplication()
    private val size = DpSize(200.dp, 100.dp)

    @Test
    fun `the color prop wins over style color, and style color applies on its own`() {
        val styleBlue = mapOf("style" to mapOf("color" to "#0000ff"))

        assertEquals(0xFFFF0000.toInt(), textColor(styleBlue + ("color" to "#ff0000")))
        assertEquals(0xFF0000FF.toInt(), textColor(styleBlue))
    }

    private fun textColor(props: Map<String, Any?>): Int {
        val node = VoltraNode.Element(VoltraElement(t = ComponentTypeID.TEXT, p = props, c = VoltraNode.Text("Hi")))
        val remoteViews =
            runBlocking {
                val factory = GlanceFactory("text-test", widgetSize = size)
                GlanceRemoteViews().compose(context, size) { factory.Render(node) }.remoteViews
            }
        return descendantsOf(remoteViews.apply(context, FrameLayout(context)))
            .filterIsInstance<TextView>()
            .single()
            .currentTextColor
    }

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
