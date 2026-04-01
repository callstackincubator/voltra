package voltra.glance.renderers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import android.util.LruCache
import androidx.compose.ui.graphics.toArgb
import voltra.styling.TextAlignment
import voltra.styling.TextDecoration
import voltra.styling.TextStyle
import voltra.styling.VoltraColorValue

private const val TAG = "TextBitmapRenderer"

/** Cache loaded typefaces to avoid repeated asset reads. */
private val typefaceCache = LruCache<String, Typeface>(10)

/**
 * Attempt to load a custom [Typeface] by family name.
 *
 * Tries in order:
 * 1. `fonts/<family>.ttf` in app assets
 * 2. `fonts/<family>.otf` in app assets
 * 3. `Typeface.create(family, …)` which resolves system-installed fonts
 *
 * Returns null if nothing could be resolved.
 */
fun loadTypeface(
    context: Context,
    family: String,
    bold: Boolean = false,
): Typeface? {
    val cacheKey = "$family-$bold"
    typefaceCache.get(cacheKey)?.let { return it }

    val baseStyle = if (bold) Typeface.BOLD else Typeface.NORMAL

    val candidates =
        listOf(
            "fonts/$family.ttf",
            "fonts/$family.otf",
        )

    for (path in candidates) {
        try {
            val tf = Typeface.createFromAsset(context.assets, path)
            if (tf != null) {
                val styled = if (bold) Typeface.create(tf, baseStyle) else tf
                typefaceCache.put(cacheKey, styled)
                return styled
            }
        } catch (_: Exception) {
            // Asset not found, try next
        }
    }

    // Fallback: try system font by name
    return try {
        val tf = Typeface.create(family, baseStyle)
        typefaceCache.put(cacheKey, tf)
        tf
    } catch (_: Exception) {
        null
    }
}

/**
 * Render text into a [Bitmap] using Android Canvas with a custom [Typeface].
 * Supports color, font size, weight, alignment, line limit, decoration, and letter spacing.
 */
fun renderTextBitmap(
    context: Context,
    text: String,
    textStyle: TextStyle,
    typeface: Typeface,
    maxWidthPx: Int,
): Bitmap {
    val density = context.resources.displayMetrics.density
    val fontSizePx = textStyle.fontSize.value * density

    val paint =
        TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            this.typeface = typeface
            this.textSize = fontSizePx
            if (textStyle.color is VoltraColorValue.Static) {
                this.color = textStyle.color.color.toArgb()
            }
            if (textStyle.letterSpacing.value > 0) {
                this.letterSpacing = textStyle.letterSpacing.value / textStyle.fontSize.value
            }
            if (textStyle.decoration == TextDecoration.UNDERLINE ||
                textStyle.decoration == TextDecoration.UNDERLINE_LINE_THROUGH
            ) {
                this.isUnderlineText = true
            }
            if (textStyle.decoration == TextDecoration.LINE_THROUGH ||
                textStyle.decoration == TextDecoration.UNDERLINE_LINE_THROUGH
            ) {
                this.isStrikeThruText = true
            }
        }

    val layoutAlignment =
        when (textStyle.alignment) {
            TextAlignment.CENTER -> Layout.Alignment.ALIGN_CENTER
            TextAlignment.END -> Layout.Alignment.ALIGN_OPPOSITE
            TextAlignment.START -> Layout.Alignment.ALIGN_NORMAL
        }

    val lineSpacingPx = textStyle.lineSpacing.value * density

    val width = if (maxWidthPx > 0) maxWidthPx else (paint.measureText(text) + 1).toInt()

    val layout =
        StaticLayout.Builder
            .obtain(text, 0, text.length, paint, width)
            .setAlignment(layoutAlignment)
            .setLineSpacing(lineSpacingPx, 1f)
            .setMaxLines(textStyle.lineLimit ?: Int.MAX_VALUE)
            .setIncludePad(false)
            .build()

    val bitmapWidth = width.coerceAtLeast(1)
    val bitmapHeight = layout.height.coerceAtLeast(1)

    val bitmap = Bitmap.createBitmap(bitmapWidth, bitmapHeight, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    layout.draw(canvas)

    return bitmap
}
