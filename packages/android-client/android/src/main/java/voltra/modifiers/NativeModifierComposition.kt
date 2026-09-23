package voltra.modifiers

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import voltra.styling.toColorProvider
import java.util.concurrent.atomic.AtomicReference

/** State that native modifiers share across the elements of one render. */
class VoltraModifierRenderState {
    private val appWidgetBackgroundOwner = AtomicReference<Any?>(null)

    /**
     * Glance fails the whole widget when two views carry `appWidgetBackground`. True for the first
     * element to ask, and again for that same element on recomposition.
     */
    fun claimAppWidgetBackground(owner: Any): Boolean =
        appWidgetBackgroundOwner.compareAndSet(null, owner) || appWidgetBackgroundOwner.get() === owner
}

/** Provided once per render at the Glance render root; without it repeats are not deduplicated. */
val LocalVoltraModifierRenderState = staticCompositionLocalOf<VoltraModifierRenderState?> { null }

/**
 * Applies the element's `modifiers` prop after `style`. Reads the theme and the render state here,
 * inside composition, so the modifier factories stay plain functions.
 */
@Composable
fun GlanceModifier.applyNativeModifiers(props: Map<String, Any?>?): GlanceModifier {
    val descriptors = VoltraModifierRegistry.parseDescriptors(props?.get("modifiers") as? String)
    if (descriptors.isEmpty()) return this

    val themeColors = GlanceTheme.colors
    val renderState = LocalVoltraModifierRenderState.current
    val scope =
        VoltraModifierScope(
            claimAppWidgetBackground = { props?.let { renderState?.claimAppWidgetBackground(it) } ?: true },
        ) { role -> role.toColorProvider(themeColors) }
    return applyNativeModifiers(descriptors, scope)
}
