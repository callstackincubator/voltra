package voltra.modifiers

import android.os.Build
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Visibility
import androidx.glance.appwidget.cornerRadius
import androidx.glance.layout.padding
import androidx.glance.visibility

/**
 * The built-in catalog. Each entry mirrors one factory in `packages/android/src/modifiers`, and the
 * shared fixture test fails when the two sides drift apart.
 */
internal val builtInModifierDefinitions: Map<String, VoltraModifierDefinition> =
    mapOf(
        "padding" to
            VoltraModifierDefinition(
                setOf("all", "horizontal", "vertical", "start", "top", "end", "bottom"),
                ::paddingModifier,
            ),
        "cornerRadius" to VoltraModifierDefinition(setOf("radius"), ::cornerRadiusModifier),
        "visibility" to VoltraModifierDefinition(setOf("visibility"), ::visibilityModifier),
    )

private fun paddingModifier(params: Map<String, Any?>): GlanceModifier {
    val all = params.optionalDp("all") ?: 0f
    val horizontal = params.optionalDp("horizontal") ?: all
    val vertical = params.optionalDp("vertical") ?: all
    return GlanceModifier.padding(
        start = (params.optionalDp("start") ?: horizontal).dp,
        top = (params.optionalDp("top") ?: vertical).dp,
        end = (params.optionalDp("end") ?: horizontal).dp,
        bottom = (params.optionalDp("bottom") ?: vertical).dp,
    )
}

private fun cornerRadiusModifier(params: Map<String, Any?>): GlanceModifier {
    val radius = params.requiredDp("radius")
    // Glance only honours cornerRadius on Android 12+ and logs a warning below it.
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        GlanceModifier.cornerRadius(radius.dp)
    } else {
        GlanceModifier
    }
}

private fun visibilityModifier(params: Map<String, Any?>): GlanceModifier {
    val visibility =
        when (params.requiredString("visibility")) {
            "visible" -> Visibility.Visible
            "invisible" -> Visibility.Invisible
            "gone" -> Visibility.Gone
            else -> throw VoltraModifierException("Invalid visibility")
        }
    return GlanceModifier.visibility(visibility)
}
