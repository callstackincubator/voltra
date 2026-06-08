package voltra.glance.renderers

import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.graphics.SweepGradient
import android.util.LruCache
import androidx.compose.ui.unit.DpSize
import voltra.styling.BackgroundImageValue
import voltra.styling.LayoutStyle
import voltra.styling.RadialGradientExtent
import voltra.styling.RadialGradientShape
import voltra.styling.SizeValue
import voltra.styling.UnitPoint
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.roundToInt
import kotlin.math.sqrt

private const val DEFAULT_BITMAP_SIZE_PX = 256
private const val MAX_BITMAP_EDGE_PX = 768
private const val MAX_BITMAP_PIXELS = 512 * 512

private val gradientBitmapCache =
    object : LruCache<String, Bitmap>(4 * 1024 * 1024) {
        override fun sizeOf(
            key: String,
            value: Bitmap,
        ): Int = value.allocationByteCount
    }

fun renderGradientBitmap(
    context: Context,
    gradient: BackgroundImageValue,
    layout: LayoutStyle,
    widgetSize: DpSize?,
    backgroundArgb: Int,
    colors: IntArray,
    positions: FloatArray,
): Bitmap {
    val (widthPx, heightPx) = resolveBitmapSize(context, layout, widgetSize)
    val cacheKey = buildCacheKey(context, gradient, widthPx, heightPx, backgroundArgb, colors, positions)

    gradientBitmapCache.get(cacheKey)?.let { return it }

    val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(backgroundArgb)

    val paint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = createShader(gradient, widthPx, heightPx, colors, positions)
        }
    canvas.drawRect(0f, 0f, widthPx.toFloat(), heightPx.toFloat(), paint)

    gradientBitmapCache.put(cacheKey, bitmap)
    return bitmap
}

private fun resolveBitmapSize(
    context: Context,
    layout: LayoutStyle,
    widgetSize: DpSize?,
): Pair<Int, Int> {
    val density =
        context.resources.displayMetrics.density
            .coerceAtLeast(1f)
    val widthDp =
        when (val width = layout.width) {
            is SizeValue.Fixed -> width.value.value
            else -> widgetSize?.width?.value
        }
    val heightDp =
        when (val height = layout.height) {
            is SizeValue.Fixed -> height.value.value
            else -> widgetSize?.height?.value
        }

    val rawWidth = resolveDimensionPx(widthDp, density)
    val rawHeight = resolveDimensionPx(heightDp, density)

    return capBitmapSize(rawWidth.coerceAtLeast(1), rawHeight.coerceAtLeast(1))
}

private fun resolveDimensionPx(
    valueDp: Float?,
    density: Float,
): Int =
    if (valueDp != null) {
        (valueDp * density).roundToInt()
    } else {
        DEFAULT_BITMAP_SIZE_PX
    }

private fun capBitmapSize(
    width: Int,
    height: Int,
): Pair<Int, Int> {
    val edgeScale = minOf(1f, MAX_BITMAP_EDGE_PX.toFloat() / maxOf(width, height).toFloat())
    val pixelScale = minOf(1f, sqrt(MAX_BITMAP_PIXELS.toFloat() / (width.toFloat() * height.toFloat())))
    val scale = minOf(edgeScale, pixelScale)
    return (width * scale).roundToInt().coerceAtLeast(1) to
        (height * scale).roundToInt().coerceAtLeast(1)
}

private fun createShader(
    gradient: BackgroundImageValue,
    width: Int,
    height: Int,
    colors: IntArray,
    positions: FloatArray,
): Shader =
    when (gradient) {
        is BackgroundImageValue.LinearGradient -> {
            android.graphics.LinearGradient(
                gradient.startPoint.x * width,
                gradient.startPoint.y * height,
                gradient.endPoint.x * width,
                gradient.endPoint.y * height,
                colors,
                positions,
                Shader.TileMode.CLAMP,
            )
        }

        is BackgroundImageValue.RadialGradient -> {
            val centerX = gradient.center.x * width
            val centerY = gradient.center.y * height
            val radii = radialRadii(gradient, width.toFloat(), height.toFloat())
            val baseRadius = maxOf(radii.first, radii.second, 0.0001f)
            RadialGradient(centerX, centerY, baseRadius, colors, positions, Shader.TileMode.CLAMP).also { shader ->
                if (gradient.shape == RadialGradientShape.ELLIPSE && radii.first > 0f && radii.second > 0f) {
                    shader.setLocalMatrix(
                        Matrix().apply {
                            setScale(radii.first / baseRadius, radii.second / baseRadius, centerX, centerY)
                        },
                    )
                }
            }
        }

        is BackgroundImageValue.ConicGradient -> {
            val centerX = gradient.center.x * width
            val centerY = gradient.center.y * height
            SweepGradient(centerX, centerY, colors, positions).also { shader ->
                shader.setLocalMatrix(
                    Matrix().apply {
                        setRotate(gradient.angleDegrees - 90f, centerX, centerY)
                    },
                )
            }
        }
    }

private fun radialRadii(
    gradient: BackgroundImageValue.RadialGradient,
    width: Float,
    height: Float,
): Pair<Float, Float> {
    val center = gradient.center.toPoint(width, height)
    val left = center.first
    val right = width - center.first
    val top = center.second
    val bottom = height - center.second

    val horizontalClosest = minOf(left, right)
    val horizontalFarthest = maxOf(left, right)
    val verticalClosest = minOf(top, bottom)
    val verticalFarthest = maxOf(top, bottom)

    val corners =
        listOf(
            0f to 0f,
            width to 0f,
            0f to height,
            width to height,
        )
    val cornerDistances = corners.map { distance(center, it) }
    val closestCorner = cornerDistances.minOrNull() ?: 0f
    val farthestCorner = cornerDistances.maxOrNull() ?: 0f

    if (gradient.shape == RadialGradientShape.CIRCLE) {
        val radius =
            when (gradient.extent) {
                RadialGradientExtent.CLOSEST_SIDE -> minOf(horizontalClosest, verticalClosest)
                RadialGradientExtent.FARTHEST_SIDE -> maxOf(horizontalFarthest, verticalFarthest)
                RadialGradientExtent.CLOSEST_CORNER -> closestCorner
                RadialGradientExtent.FARTHEST_CORNER -> farthestCorner
            }.coerceAtLeast(0f)
        return radius to radius
    }

    return when (gradient.extent) {
        RadialGradientExtent.CLOSEST_SIDE -> {
            horizontalClosest.coerceAtLeast(0f) to verticalClosest.coerceAtLeast(0f)
        }

        RadialGradientExtent.FARTHEST_SIDE -> {
            horizontalFarthest.coerceAtLeast(0f) to verticalFarthest.coerceAtLeast(0f)
        }

        RadialGradientExtent.CLOSEST_CORNER,
        RadialGradientExtent.FARTHEST_CORNER,
        -> {
            ellipseCornerRadii(gradient.extent, center, corners, width, height, closestCorner, farthestCorner)
        }
    }
}

private fun ellipseCornerRadii(
    extent: RadialGradientExtent,
    center: Pair<Float, Float>,
    corners: List<Pair<Float, Float>>,
    width: Float,
    height: Float,
    closestCorner: Float,
    farthestCorner: Float,
): Pair<Float, Float> {
    val target = if (extent == RadialGradientExtent.CLOSEST_CORNER) closestCorner else farthestCorner
    val referenceCorner =
        if (extent == RadialGradientExtent.CLOSEST_CORNER) {
            corners.minByOrNull { distance(center, it) }
        } else {
            corners.maxByOrNull { distance(center, it) }
        } ?: (width to height)

    val dx = abs(referenceCorner.first - center.first)
    val dy = abs(referenceCorner.second - center.second)
    if (dy == 0f) return target.coerceAtLeast(0f) to target.coerceAtLeast(0f)

    val aspect = width / height.coerceAtLeast(1f)
    val ry = sqrt((dx * dx) / (aspect * aspect).coerceAtLeast(0.0001f) + dy * dy)
    if (ry == 0f) return target.coerceAtLeast(0f) to target.coerceAtLeast(0f)

    val scale = target / ry
    return (aspect * ry * scale).coerceAtLeast(0f) to (ry * scale).coerceAtLeast(0f)
}

private fun UnitPoint.toPoint(
    width: Float,
    height: Float,
): Pair<Float, Float> = x * width to y * height

private fun distance(
    a: Pair<Float, Float>,
    b: Pair<Float, Float>,
): Float = hypot((a.first - b.first).toDouble(), (a.second - b.second).toDouble()).toFloat()

private fun buildCacheKey(
    context: Context,
    gradient: BackgroundImageValue,
    width: Int,
    height: Int,
    backgroundArgb: Int,
    colors: IntArray,
    positions: FloatArray,
): String {
    val uiMode = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
    return buildString {
        append(width).append('x').append(height)
        append('|').append(uiMode)
        append('|').append(backgroundArgb)
        append('|').append(gradientKey(gradient))
        append('|').append(colors.joinToString(","))
        append('|').append(positions.joinToString(","))
    }
}

private fun gradientKey(gradient: BackgroundImageValue): String =
    when (gradient) {
        is BackgroundImageValue.LinearGradient -> {
            "linear:${gradient.startPoint}:${gradient.endPoint}"
        }

        is BackgroundImageValue.RadialGradient -> {
            "radial:${gradient.center}:${gradient.shape}:${gradient.extent}"
        }

        is BackgroundImageValue.ConicGradient -> {
            "conic:${gradient.center}:${gradient.angleDegrees}"
        }
    }
