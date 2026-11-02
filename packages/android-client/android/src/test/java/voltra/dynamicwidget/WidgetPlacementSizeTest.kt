package voltra.dynamicwidget

import android.appwidget.AppWidgetManager
import android.os.Bundle
import android.util.SizeF
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * [WidgetPlacementSize.fromOptions] is what both `getActiveWidgets()` and the lifecycle events use
 * to describe a placement's size.
 */
@RunWith(RobolectricTestRunner::class)
class WidgetPlacementSizeTest {
    private fun boundsOptions(
        minWidth: Int,
        minHeight: Int,
        maxWidth: Int,
        maxHeight: Int,
    ) = Bundle().apply {
        putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, minWidth)
        putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, minHeight)
        putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, maxWidth)
        putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, maxHeight)
    }

    @Test
    @Config(sdk = [30])
    fun `below API 31 sizes are the portrait and landscape estimates from the bounds`() {
        val size = WidgetPlacementSize.fromOptions(boundsOptions(250, 90, 340, 110))

        assertEquals(250, size.width)
        assertEquals(90, size.height)
        assertEquals(
            listOf(WidgetPlacementSize.Dp(250.0, 110.0), WidgetPlacementSize.Dp(340.0, 90.0)),
            size.sizes,
        )
    }

    @Test
    @Config(sdk = [30])
    fun `a missing max bound falls back to the min bound instead of zero`() {
        val options =
            Bundle().apply {
                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 110)
                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 40)
            }

        assertEquals(listOf(WidgetPlacementSize.Dp(110.0, 40.0)), WidgetPlacementSize.fromOptions(options).sizes)
    }

    @Test
    @Config(sdk = [30])
    fun `bounds for only one dimension give no estimate`() {
        val options = Bundle().apply { putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 340) }

        assertEquals(emptyList<WidgetPlacementSize.Dp>(), WidgetPlacementSize.fromOptions(options).sizes)
    }

    @Test
    @Config(sdk = [31])
    fun `launcher sizes lose duplicates, keep launcher order and come out as the float prints them`() {
        val options =
            boundsOptions(250, 90, 340, 110).apply {
                putParcelableArrayList(
                    AppWidgetManager.OPTION_APPWIDGET_SIZES,
                    arrayListOf(
                        SizeF(340f, 90f),
                        SizeF(172.19048f, 110f),
                        SizeF(340f, 90f),
                    ),
                )
            }

        val size = WidgetPlacementSize.fromOptions(options)

        assertEquals(
            listOf(WidgetPlacementSize.Dp(340.0, 90.0), WidgetPlacementSize.Dp(172.19048, 110.0)),
            size.sizes,
        )
    }
}
