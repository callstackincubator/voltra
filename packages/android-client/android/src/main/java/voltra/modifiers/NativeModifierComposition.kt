package voltra.modifiers

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.models.componentProp
import voltra.payload.ComponentTypeID
import voltra.styling.toColorProvider

/**
 * Decisions native modifiers share across the elements of one rendered tree, made up front from the
 * whole tree so that no element depends on render order, recomposition or object identity.
 */
data class VoltraModifierRenderState(
    /**
     * The only element allowed to carry `appWidgetBackground`, or null when none may. Glance fails
     * the whole widget when two views carry the marker. Matched by value: a structurally equal tree
     * parsed again, or a component prop node resolved again, still matches.
     */
    val appWidgetBackgroundOwner: VoltraElement?,
) {
    fun mayCarryAppWidgetBackground(element: VoltraElement): Boolean = element == appWidgetBackgroundOwner

    companion object {
        /**
         * Picks the first element in tree order that asks for `appWidgetBackground` and appears
         * only once in the rendered tree; a shared element referenced twice would mark two views.
         * None is picked when the tree contains a Scaffold, because Glance's Scaffold already marks
         * its own root.
         */
        fun forTree(
            root: VoltraNode?,
            sharedElements: List<VoltraNode>?,
        ): VoltraModifierRenderState {
            val carriers = mutableListOf<VoltraElement>()
            var hasScaffold = false
            visitRenderedElements(root, sharedElements) { element ->
                if (element.t == ComponentTypeID.SCAFFOLD) hasScaffold = true
                if (element.nativeModifiers.any { it.type == APP_WIDGET_BACKGROUND }) carriers += element
            }
            val owner =
                if (hasScaffold) {
                    null
                } else {
                    carriers.firstOrNull { candidate -> carriers.count { it == candidate } == 1 }
                }
            return VoltraModifierRenderState(owner)
        }
    }
}

internal const val APP_WIDGET_BACKGROUND = "appWidgetBackground"

/** Provided once per render at the Glance render root; without it repeats are not deduplicated. */
val LocalVoltraModifierRenderState = staticCompositionLocalOf<VoltraModifierRenderState?> { null }

/**
 * Applies the element's `modifiers` prop after `style`. Reads the theme and the render state here,
 * inside composition, so the modifier factories stay plain functions.
 */
@Composable
fun GlanceModifier.applyNativeModifiers(element: VoltraElement): GlanceModifier {
    val descriptors = element.nativeModifiers
    if (descriptors.isEmpty()) return this

    val themeColors = GlanceTheme.colors
    val renderState = LocalVoltraModifierRenderState.current
    val scope =
        VoltraModifierScope(
            mayCarryAppWidgetBackground = { renderState?.mayCarryAppWidgetBackground(element) ?: true },
        ) { role -> role.toColorProvider(themeColors) }
    return applyNativeModifiers(descriptors, scope)
}

/**
 * Visits every element the Glance renderers draw, in render order: children, shared element
 * references (once per reference), and the Image `fallback` node, the only component prop the
 * Android renderers draw as a node.
 */
private fun visitRenderedElements(
    node: VoltraNode?,
    sharedElements: List<VoltraNode>?,
    visit: (VoltraElement) -> Unit,
) {
    when (node) {
        is VoltraNode.Element -> {
            val element = node.element
            visit(element)
            visitRenderedElements(element.c, sharedElements, visit)
            if (element.t == ComponentTypeID.IMAGE) {
                visitRenderedElements(element.componentProp("fallback", null, sharedElements), sharedElements, visit)
            }
        }

        is VoltraNode.Array -> {
            node.elements.forEach { visitRenderedElements(it, sharedElements, visit) }
        }

        is VoltraNode.Ref -> {
            visitRenderedElements(sharedElements?.getOrNull(node.ref), sharedElements, visit)
        }

        is VoltraNode.Text, null -> {}
    }
}
