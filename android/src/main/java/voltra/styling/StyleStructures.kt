package voltra.styling

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.Visibility
import androidx.glance.text.FontWeight

/**
 * Size value that can be a fixed dimension, percentage, or wrap content.
 */
sealed class SizeValue {
    data class Fixed(
        val value: Dp,
    ) : SizeValue()

    object Fill : SizeValue() // "100%"

    object Wrap : SizeValue() // "auto" or undefined
}

/**
 * Layout-related styles (dimensions, spacing, flex).
 * Mirrors iOS LayoutStyle.swift
 */
data class LayoutStyle(
    // Dimensions - can be fixed dp, "100%" (fill), or wrap
    val width: SizeValue? = null,
    val height: SizeValue? = null,
    val minWidth: Dp? = null,
    val maxWidth: Dp? = null,
    val minHeight: Dp? = null,
    val maxHeight: Dp? = null,
    // Flexibility - weight is the proper way to handle flex in Glance
    val weight: Float? = null,
    // Aspect Ratio (not supported in Glance, but kept for API compatibility)
    val aspectRatio: Float? = null,
    // Spacing
    val padding: EdgeInsets? = null,
    // Positioning (not supported in Glance, but kept for API compatibility)
    val position: Offset? = null,
    val zIndex: Float? = null,
    // Visibility
    val visibility: Visibility? = null,
) {
    companion object {
        val Default = LayoutStyle()
    }
}

/**
 * Decoration styles (background, border, shadow, effects).
 * Mirrors iOS DecorationStyle.swift
 */
data class DecorationStyle(
    val backgroundColor: Color? = null,
    val cornerRadius: Dp? = null,
    val clipToOutline: Boolean = false,
    val border: BorderStyle? = null,
    val shadow: ShadowStyle? = null, // Not supported in Glance
    val overflow: Overflow? = null, // Not supported in Glance
    val glassEffect: GlassEffect? = null, // Not supported in Glance
) {
    companion object {
        val Default = DecorationStyle()
    }
}

/**
 * Border configuration.
 */
data class BorderStyle(
    val width: Dp,
    val color: Color,
)

/**
 * Shadow configuration (not supported in Glance, but kept for API compatibility).
 */
data class ShadowStyle(
    val radius: Dp,
    val color: Color,
    val opacity: Float,
    val offset: Offset,
)

/**
 * Rendering styles (opacity, transform).
 * Mirrors iOS RenderingStyle.swift
 */
data class RenderingStyle(
    val opacity: Float = 1.0f,
    val transform: TransformStyle? = null, // Not supported in Glance
) {
    companion object {
        val Default = RenderingStyle()
    }
}

/**
 * Transform configuration (not supported in Glance, but kept for API compatibility).
 */
data class TransformStyle(
    val rotate: Float? = null, // in degrees
    val scale: Float? = null,
    val scaleX: Float? = null,
    val scaleY: Float? = null,
)

/**
 * Text-related styles.
 * Mirrors iOS TextStyle.swift
 */
data class TextStyle(
    val color: Color? = null,
    val fontSize: TextUnit = 17.sp,
    val fontWeight: FontWeight? = null,
    val alignment: TextAlignment = TextAlignment.START,
    val lineLimit: Int? = null,
    val lineSpacing: Dp = 0.dp, // Not fully supported in Glance
    val decoration: TextDecoration = TextDecoration.NONE,
    val letterSpacing: Dp = 0.dp, // Not supported in Glance
    val fontVariant: Set<FontVariant> = emptySet(), // Not supported in Glance
) {
    companion object {
        val Default = TextStyle()
    }
}

/**
 * Edge insets for padding.
 * Mirrors SwiftUI EdgeInsets.
 */
data class EdgeInsets(
    val top: Dp = 0.dp,
    val leading: Dp = 0.dp,
    val bottom: Dp = 0.dp,
    val trailing: Dp = 0.dp,
)

/**
 * 2D offset for positioning.
 */
data class Offset(
    val x: Dp = 0.dp,
    val y: Dp = 0.dp,
)

/**
 * Text alignment options.
 */
enum class TextAlignment {
    START,
    CENTER,
    END,
}

/**
 * Text decoration options.
 */
enum class TextDecoration {
    NONE,
    UNDERLINE,
    LINE_THROUGH,
    UNDERLINE_LINE_THROUGH,
}

/**
 * Overflow behavior (not supported in Glance).
 */
enum class Overflow {
    VISIBLE,
    HIDDEN,
}

/**
 * Glass effect options (not supported in Glance).
 */
enum class GlassEffect {
    CLEAR,
    IDENTITY,
    REGULAR,
    NONE,
}

/**
 * Font variant options (not supported in Glance).
 */
enum class FontVariant(
    val value: String,
) {
    SMALL_CAPS("small-caps"),
    TABULAR_NUMS("tabular-nums"),
}

/**
 * Composite style containing all style categories.
 * Mirrors iOS approach of returning a tuple.
 */
data class CompositeStyle(
    val layout: LayoutStyle = LayoutStyle.Default,
    val decoration: DecorationStyle = DecorationStyle.Default,
    val rendering: RenderingStyle = RenderingStyle.Default,
    val text: TextStyle = TextStyle.Default,
)
