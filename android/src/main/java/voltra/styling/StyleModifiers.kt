package voltra.styling

import android.os.Build
import android.util.Log
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.unit.ColorProvider
import androidx.glance.visibility
import androidx.glance.text.TextDecoration as GlanceTextDecoration
import androidx.glance.text.TextStyle as GlanceTextStyle

/**
 * Extension functions to apply structured styles to Glance modifiers.
 * Mirrors iOS View+applyStyle.swift - provides clean interface for style application.
 *
 * Apply composite style to a GlanceModifier.
 * This is the main entry point for applying styles.
 *
 * Order of application (mirrors iOS):
 * 1. Layout (dimensions, flex, padding)
 * 2. Decoration (background, border)
 * 3. Rendering (opacity - limited support)
 *
 * Usage:
 *   GlanceModifier.applyStyle(style)
 */
fun GlanceModifier.applyStyle(style: CompositeStyle): GlanceModifier {
    var modifier = this

    // 1. Apply Layout (dimensions, flex, inner padding)
    modifier = modifier.applyLayout(style.layout)

    // 2. Apply Decoration (background, border)
    modifier = modifier.applyDecoration(style.decoration)

    // 3. Apply Rendering (opacity - limited in Glance)
    modifier = modifier.applyRendering(style.rendering)

    return modifier
}

/**
 * Extension for ROW scope to apply flex/weight modifier.
 * .defaultWeight() and .weight() are only available in RowScope.
 */
fun RowScope.applyFlex(
    modifier: GlanceModifier,
    flex: Float?,
): GlanceModifier =
    if (flex != null && flex > 0) {
        // .defaultWeight() is available here because we are in RowScope
        modifier.defaultWeight()
    } else {
        modifier
    }

/**
 * Extension for COLUMN scope to apply flex/weight modifier.
 * .defaultWeight() and .weight() are only available in ColumnScope.
 */
fun ColumnScope.applyFlex(
    modifier: GlanceModifier,
    flex: Float?,
): GlanceModifier =
    if (flex != null && flex > 0) {
        // .defaultWeight() is available here because we are in ColumnScope
        modifier.defaultWeight()
    } else {
        modifier
    }

/**
 * Apply layout styles to modifier.
 * Handles dimensions and inner padding.
 * Note: Weight/Flex is handled separately in RowScope/ColumnScope via applyFlex().
 *
 * Order of application:
 * 1. FillMaxSize optimization (if both width and height are Fill)
 * 2. Width (Fill, Fixed, or Wrap)
 * 3. Height (Fill, Fixed, or Wrap)
 * 4. Padding
 */
private fun GlanceModifier.applyLayout(layout: LayoutStyle): GlanceModifier {
    var modifier = this

    // --- PHASE 1: Fill Max Size (Optimization) ---
    // Check if BOTH are set to Fill (100%) to use the specialized fillMaxSize modifier
    val isFullWidth = layout.width is SizeValue.Fill
    val isFullHeight = layout.height is SizeValue.Fill

    if (isFullWidth && isFullHeight) {
        // Optimization: Use one modifier instead of two
        modifier = modifier.fillMaxSize()
    } else {
        // --- PHASE 3: Width (Fill vs Wrap vs Fixed) ---
        modifier =
            when (val width = layout.width) {
                is SizeValue.Fill -> modifier.fillMaxWidth()
                is SizeValue.Fixed -> modifier.width(width.value)
                is SizeValue.Wrap -> modifier.wrapContentWidth()
                null -> modifier.wrapContentWidth()
            }

        // --- PHASE 4: Height (Fill vs Wrap vs Fixed) ---
        modifier =
            when (val height = layout.height) {
                is SizeValue.Fill -> modifier.fillMaxHeight()
                is SizeValue.Fixed -> modifier.height(height.value)
                is SizeValue.Wrap -> modifier.wrapContentHeight()
                null -> modifier.wrapContentHeight()
            }
    }

    // --- PHASE 5: Min/Max constraints (not supported in Glance - log warning) ---
    if (layout.minWidth != null ||
        layout.maxWidth != null ||
        layout.minHeight != null ||
        layout.maxHeight != null
    ) {
        Log.w(
            "StyleModifier",
            "Min/max width/height constraints not supported in Glance widgets",
        )
    }

    // --- PHASE 6: Aspect ratio (not supported in Glance) ---
    if (layout.aspectRatio != null) {
        Log.w("StyleModifier", "aspectRatio not supported in Glance widgets")
    }

    // --- PHASE 7: Inner padding (applied after sizing) ---
    val padding = layout.padding
    if (padding != null && !padding.isZero()) {
        modifier =
            modifier.padding(
                start = padding.leading,
                top = padding.top,
                end = padding.trailing,
                bottom = padding.bottom,
            )
    }

    // --- PHASE 8: Visibility ---
    if (layout.visibility != null) {
        modifier = modifier.visibility(layout.visibility)
    }

    return modifier
}

/**
 * Apply decoration styles to modifier.
 * Handles background color, corner radius, and borders.
 */
private fun GlanceModifier.applyDecoration(decoration: DecorationStyle): GlanceModifier {
    var modifier = this

    // A. Background color
    if (decoration.backgroundColor != null) {
        modifier = modifier.background(decoration.backgroundColor)
    }

    // B. Corner radius (requires Android 12+/API 31+)
    if (decoration.cornerRadius != null && decoration.cornerRadius.value > 0) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            modifier = modifier.cornerRadius(decoration.cornerRadius)
        } else {
            Log.w(
                "StyleModifier",
                "cornerRadius requires Android 12+ (API 31+), current: ${Build.VERSION.SDK_INT}",
            )
        }
    }

    // C. Border (not yet implemented in Glance)
    if (decoration.border != null) {
        Log.w("StyleModifier", "Border styling not yet implemented for Glance widgets")
        // TODO: Implement using GlanceModifier.border() when available
    }

    // D. Shadow (not supported in Glance)
    if (decoration.shadow != null) {
        Log.w("StyleModifier", "Shadow effects not supported in Glance widgets")
    }

    // E. Overflow (not supported in Glance)
    if (decoration.overflow != null) {
        Log.w("StyleModifier", "Overflow control not supported in Glance widgets")
    }

    // F. Glass effect (iOS-specific, not supported)
    if (decoration.glassEffect != null) {
        Log.w("StyleModifier", "Glass effects not supported in Glance widgets")
    }

    return modifier
}

/**
 * Apply rendering styles to modifier.
 * Handles opacity and transforms (limited support in Glance).
 */
private fun GlanceModifier.applyRendering(rendering: RenderingStyle): GlanceModifier {
    var modifier = this

    // A. Opacity (Glance doesn't have opacity modifier)
    // Would need to apply alpha to all colors instead
    if (rendering.opacity < 1.0f) {
        Log.w(
            "StyleModifier",
            "Opacity modifier not supported in Glance - apply alpha to colors instead",
        )
    }

    // B. Transform (not supported in Glance)
    if (rendering.transform != null) {
        Log.w("StyleModifier", "Transform effects not supported in Glance widgets")
    }

    return modifier
}

/**
 * Convert TextStyle to GlanceTextStyle.
 * Glance has limited text styling compared to SwiftUI.
 */
fun TextStyle.toGlanceTextStyle(): GlanceTextStyle {
    var glanceStyle = GlanceTextStyle()

    // Font size
    if (fontSize.value > 0) {
        glanceStyle = GlanceTextStyle(fontSize = fontSize)
    }

    // Color
    if (color != null) {
        glanceStyle =
            GlanceTextStyle(
                fontSize = fontSize,
                color = ColorProvider(color),
            )
    }

    // Font weight
    if (fontWeight != null) {
        glanceStyle =
            GlanceTextStyle(
                fontSize = fontSize,
                color =
                    color?.let { ColorProvider(it) } ?: ColorProvider(androidx.compose.ui.graphics.Color.Unspecified),
                fontWeight = fontWeight,
            )
    }

    // Text decoration (limited support)
    val glanceDecoration =
        when (decoration) {
            TextDecoration.UNDERLINE -> {
                GlanceTextDecoration.Underline
            }

            TextDecoration.LINE_THROUGH -> {
                GlanceTextDecoration.LineThrough
            }

            TextDecoration.UNDERLINE_LINE_THROUGH -> {
                Log.w("StyleModifier", "Combined underline + line-through not supported, using underline")
                GlanceTextDecoration.Underline
            }

            TextDecoration.NONE -> {
                null
            }
        }

    if (glanceDecoration != null) {
        glanceStyle =
            GlanceTextStyle(
                fontSize = fontSize,
                color =
                    color?.let { ColorProvider(it) } ?: ColorProvider(androidx.compose.ui.graphics.Color.Unspecified),
                fontWeight = fontWeight,
                textDecoration = glanceDecoration,
            )
    }

    // Text alignment - handled at Text component level, not in TextStyle
    // Line limit - handled at Text component level
    // Letter spacing - not supported in Glance
    // Font variant - not supported in Glance

    if (letterSpacing.value > 0) {
        Log.w("StyleModifier", "letterSpacing not supported in Glance TextStyle")
    }

    if (fontVariant.isNotEmpty()) {
        Log.w("StyleModifier", "fontVariant not supported in Glance TextStyle")
    }

    return glanceStyle
}

/**
 * Check if EdgeInsets are all zero.
 */
private fun EdgeInsets.isZero(): Boolean =
    top.value == 0f &&
        leading.value == 0f &&
        bottom.value == 0f &&
        trailing.value == 0f
