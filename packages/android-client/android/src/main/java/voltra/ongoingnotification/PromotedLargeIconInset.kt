package voltra.ongoingnotification

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Icon
import android.os.Build
import android.util.TypedValue
import android.view.View
import kotlin.math.roundToInt

/**
 * Works around platform builds that lay out a promoted ongoing notification's large icon with no end
 * margin, so the icon sits flush against the card edge and is clipped by its rounded corner.
 *
 * On Android 16, `Notification.Builder#getLargeIconMarginEnd` takes the end margin of a promoted
 * notification's large icon from `notification_2025_margin`. Samsung One UI 8 sets that dimension to
 * 0dp. The system inflates notification views itself and promoted notifications cannot use custom
 * views, so the bitmap is the only thing an app controls: the missing margin is baked into it as
 * transparent padding on the end side.
 */
internal object PromotedLargeIconInset {
    // Notification.Builder#calculateRightIconDimens sizes the large icon to the template's icon
    // height and widens it for landscape images up to 16:9. Narrower images are shown square.
    private const val MAX_ASPECT_RATIO = 16f / 9f
    private const val FALLBACK_INSET_DP = 16f
    private const val FALLBACK_ICON_SIZE_DP = 36f

    data class Layout(
        val canvasWidth: Int,
        val canvasHeight: Int,
        val sourceCrop: Rect,
        val contentLeft: Int,
        val contentTop: Int,
        val contentWidth: Int,
        val contentHeight: Int,
    )

    /**
     * Returns the inset to add as a fraction of the large icon's displayed height, or null when the
     * platform already applies an end margin to promoted large icons.
     */
    @SuppressLint("DiscouragedApi")
    fun requiredInsetRatio(): Float? {
        if (Build.VERSION.SDK_INT < 36) return null

        val resources = Resources.getSystem()
        val marginId = resources.getIdentifier("notification_2025_margin", "dimen", "android")
        if (marginId == 0 || resources.getDimensionPixelSize(marginId) > 0) return null

        val inset = systemDimension(resources, "notification_content_margin_end", FALLBACK_INSET_DP)
        val iconSize = systemDimension(resources, "notification_right_icon_size", FALLBACK_ICON_SIZE_DP)
        return inset / iconSize
    }

    fun apply(
        context: Context,
        icon: Icon,
        insetRatio: Float,
    ): Icon {
        val drawable = icon.loadDrawable(context) ?: return icon
        val source =
            (drawable as? BitmapDrawable)?.bitmap
                ?: run {
                    val width = drawable.intrinsicWidth
                    val height = drawable.intrinsicHeight
                    if (width <= 0 || height <= 0) return icon
                    Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { bitmap ->
                        drawable.setBounds(0, 0, width, height)
                        drawable.draw(Canvas(bitmap))
                    }
                }

        val iconSize = systemDimension(Resources.getSystem(), "notification_right_icon_size", FALLBACK_ICON_SIZE_DP)
        val layout =
            computeLayout(
                sourceWidth = source.width,
                sourceHeight = source.height,
                insetRatio = insetRatio,
                isRtl = context.resources.configuration.layoutDirection == View.LAYOUT_DIRECTION_RTL,
                maxHeight = (iconSize * 2).roundToInt().coerceAtLeast(1),
            ) ?: return icon

        val output = Bitmap.createBitmap(layout.canvasWidth, layout.canvasHeight, Bitmap.Config.ARGB_8888)
        val destination =
            Rect(
                layout.contentLeft,
                layout.contentTop,
                layout.contentLeft + layout.contentWidth,
                layout.contentTop + layout.contentHeight,
            )
        Canvas(output).drawBitmap(source, layout.sourceCrop, destination, Paint(Paint.FILTER_BITMAP_FLAG))
        return Icon.createWithBitmap(output)
    }

    /**
     * Lays out the image on a transparent canvas so that, once the system center-crops it into the
     * large icon view, the visible image matches the unpadded one and is followed by the inset on the
     * end side. When the padded canvas would exceed 16:9, the image is scaled down to make room.
     */
    fun computeLayout(
        sourceWidth: Int,
        sourceHeight: Int,
        insetRatio: Float,
        isRtl: Boolean,
        maxHeight: Int,
    ): Layout? {
        if (sourceWidth <= 0 || sourceHeight <= 0 || insetRatio <= 0f || maxHeight <= 0) return null

        // The part of the image the system would show without padding.
        val aspectRatio = (sourceWidth.toFloat() / sourceHeight).coerceIn(1f, MAX_ASPECT_RATIO)
        val cropWidth = minOf(sourceWidth.toFloat(), sourceHeight * aspectRatio)
        val cropHeight = cropWidth / aspectRatio
        val cropLeft = (sourceWidth - cropWidth) / 2
        val cropTop = (sourceHeight - cropHeight) / 2
        val sourceCrop =
            Rect(
                cropLeft.roundToInt(),
                cropTop.roundToInt(),
                (cropLeft + cropWidth).roundToInt(),
                (cropTop + cropHeight).roundToInt(),
            )

        val canvasHeight = minOf(cropHeight, maxHeight.toFloat())
        val inset = canvasHeight * insetRatio
        val canvasWidth = minOf(canvasHeight * aspectRatio + inset, canvasHeight * MAX_ASPECT_RATIO)
        val contentWidth = canvasWidth - inset
        val contentHeight = contentWidth / aspectRatio
        val contentTop = (canvasHeight - contentHeight) / 2

        return Layout(
            canvasWidth = canvasWidth.roundToInt(),
            canvasHeight = canvasHeight.roundToInt(),
            sourceCrop = sourceCrop,
            contentLeft = if (isRtl) inset.roundToInt() else 0,
            contentTop = contentTop.roundToInt(),
            contentWidth = contentWidth.roundToInt(),
            contentHeight = contentHeight.roundToInt(),
        )
    }

    @SuppressLint("DiscouragedApi")
    private fun systemDimension(
        resources: Resources,
        name: String,
        fallbackDp: Float,
    ): Float {
        val id = resources.getIdentifier(name, "dimen", "android")
        if (id != 0) {
            val value = resources.getDimension(id)
            if (value > 0f) return value
        }
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, fallbackDp, resources.displayMetrics)
    }
}
