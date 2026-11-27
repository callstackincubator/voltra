package voltra.dynamicwidget

import android.appwidget.AppWidgetManager
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject

/**
 * A placement's size in dp, as `getActiveWidgets()` reports it and the lifecycle events carry it.
 */
internal data class WidgetPlacementSize(
    val width: Int,
    val height: Int,
    val sizes: List<Dp>,
) {
    data class Dp(
        val width: Double,
        val height: Double,
    )

    fun isSameSizeAs(other: WidgetPlacementSize): Boolean =
        width == other.width && height == other.height && sizes.toSet() == other.sizes.toSet()

    fun writeTo(json: JSONObject): JSONObject =
        json
            .put("width", width)
            .put("height", height)
            .put("sizes", JSONArray(sizes.map { JSONObject().put("width", it.width).put("height", it.height) }))

    fun writeTo(map: WritableMap) {
        map.putInt("width", width)
        map.putInt("height", height)
        map.putArray(
            "sizes",
            Arguments.createArray().apply {
                sizes.forEach {
                    pushMap(
                        Arguments.createMap().apply {
                            putDouble("width", it.width)
                            putDouble("height", it.height)
                        },
                    )
                }
            },
        )
    }

    companion object {
        private val SIZE_KEYS =
            listOf(
                AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,
                AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,
                AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,
                AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,
                AppWidgetManager.OPTION_APPWIDGET_SIZES,
            )

        fun hasSizeOptions(options: Bundle): Boolean = SIZE_KEYS.any(options::containsKey)

        fun fromOptions(options: Bundle): WidgetPlacementSize {
            val sizes =
                if (!hasSizeOptions(options)) {
                    emptyList()
                } else {
                    launcherSizes(options).ifEmpty { estimatedSizes(options) }
                }

            return WidgetPlacementSize(
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH),
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT),
                sizes.distinct(),
            )
        }

        // Portrait (min width, max height) and landscape (max width, min height). A missing bound
        // takes the other bound of its dimension; a dimension with neither gives no estimate.
        private fun estimatedSizes(options: Bundle): List<Dp> {
            val width =
                bounds(
                    options,
                    AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,
                    AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,
                )
            val height =
                bounds(
                    options,
                    AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,
                    AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,
                )
            if (width == null || height == null) return emptyList()

            return listOf(Dp(width.first, height.second), Dp(width.second, height.first))
        }

        private fun bounds(
            options: Bundle,
            minKey: String,
            maxKey: String,
        ): Pair<Double, Double>? {
            val min = options.intOrNull(minKey) ?: options.intOrNull(maxKey) ?: return null
            val max = options.intOrNull(maxKey) ?: min
            return min.toDouble() to max.toDouble()
        }

        private fun Bundle.intOrNull(key: String): Int? = if (containsKey(key)) getInt(key) else null

        @Suppress("DEPRECATION")
        private fun launcherSizes(options: Bundle): List<Dp> {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return emptyList()

            return options
                .getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
                .orEmpty()
                .map { Dp(it.width.asPrinted(), it.height.asPrinted()) }
        }

        // Float.toDouble() widens 172.19048f to 172.19047546386719; going through the float's
        // string keeps the value the launcher wrote.
        private fun Float.asPrinted(): Double = toString().toDouble()
    }
}
