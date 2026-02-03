package voltra.glance

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.action.clickable
import voltra.glance.renderers.getOnClickAction
import voltra.payload.ComponentTypeID
import voltra.styling.CompositeStyle
import voltra.styling.StyleConverter
import voltra.styling.applyStyle

data class ResolvedStyle(
    val modifier: GlanceModifier,
    val compositeStyle: CompositeStyle?,
)

fun resolveAndApplyStyle(
    props: Map<String, Any>?,
    sharedStyles: List<Map<String, Any>>?,
): ResolvedStyle {
    val resolvedStyle = resolveStyle(props, sharedStyles)
    val compositeStyle =
        if (resolvedStyle != null) {
            StyleConverter.convert(resolvedStyle)
        } else {
            null
        }
    val modifier =
        if (compositeStyle != null) {
            GlanceModifier.applyStyle(compositeStyle)
        } else {
            GlanceModifier
        }
    return ResolvedStyle(modifier, compositeStyle)
}

/**
 * Resolve style reference to actual style map.
 * Props may contain {"s": <index>} where index references sharedStyles array,
 * or {"s": {...}} for inline styles.
 */
private fun resolveStyle(
    props: Map<String, Any>?,
    sharedStyles: List<Map<String, Any>>?,
): Map<String, Any>? {
    if (props == null) return null

    val styleRef = props["style"]
    return when (styleRef) {
        is Number -> {
            // It's an index into sharedStyles
            val index = styleRef.toInt()
            sharedStyles?.getOrNull(index)
        }

        is Map<*, *> -> {
            // It's already an inline style
            @Suppress("UNCHECKED_CAST")
            styleRef as? Map<String, Any>
        }

        else -> {
            null
        }
    }
}

/**
 * Apply clickable modifier if pressable prop is true.
 * Skips components that already have built-in click handlers.
 *
 * @param modifier The GlanceModifier to enhance
 * @param props The component props
 * @param elementId The element's ID (from element.i)
 * @param widgetId The widget ID for the action callback
 * @param componentType The component type (from ComponentTypeID)
 * @param elementHashCode The hash code of the element for generating fallback IDs
 * @return The modifier with clickable applied if needed, otherwise unchanged
 */
@Composable
fun applyClickableIfNeeded(
    modifier: GlanceModifier,
    props: Map<String, Any>?,
    elementId: String?,
    widgetId: String,
    componentType: Int,
    elementHashCode: Int,
): GlanceModifier {
    // Check if deepLinkUrl prop is set and not empty
    val deepLinkUrl = (props?.get("dlu") as? String) ?: (props?.get("deepLinkUrl") as? String)
    val isClickable = deepLinkUrl != null && deepLinkUrl.isNotEmpty()

    if (!isClickable) {
        return modifier
    }

    // Skip components that already have built-in click handlers
    val exclusionList =
        setOf(
            ComponentTypeID.FILLED_BUTTON,
            ComponentTypeID.OUTLINE_BUTTON,
            ComponentTypeID.CIRCLE_ICON_BUTTON,
            ComponentTypeID.SQUARE_ICON_BUTTON,
            ComponentTypeID.SWITCH,
            ComponentTypeID.RADIO_BUTTON,
            ComponentTypeID.CHECK_BOX,
        )

    if (componentType in exclusionList) {
        return modifier
    }

    // Extract or generate component ID (prefer user-provided ID, fallback to generated)
    val componentId = elementId ?: "pressable_$elementHashCode"

    // Apply clickable modifier
    return modifier.clickable(
        getOnClickAction(
            LocalContext.current,
            props,
            widgetId,
            componentId,
        ),
    )
}
