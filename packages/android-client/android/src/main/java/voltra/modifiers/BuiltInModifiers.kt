package voltra.modifiers

import android.os.Build
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Visibility
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.absolutePadding
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.layout.wrapContentHeight
import androidx.glance.layout.wrapContentSize
import androidx.glance.layout.wrapContentWidth
import androidx.glance.semantics.contentDescription
import androidx.glance.semantics.semantics
import androidx.glance.semantics.testTag
import androidx.glance.visibility
import voltra.styling.VoltraColorValue

/**
 * The built-in catalog. Each entry mirrors one factory in `packages/android/src/modifiers`, and the
 * shared fixture test fails when the two sides drift apart.
 */
internal val builtInModifierDefinitions: Map<String, VoltraModifierDefinition> =
    mapOf(
        "padding" to
            VoltraModifierDefinition(
                setOf("all", "horizontal", "vertical", "start", "top", "end", "bottom"),
            ) { params, _ ->
                val edges = params.edges(leading = "start", trailing = "end")
                GlanceModifier.padding(edges[0].dp, edges[1].dp, edges[2].dp, edges[3].dp)
            },
        "absolutePadding" to
            VoltraModifierDefinition(
                setOf("all", "horizontal", "vertical", "left", "top", "right", "bottom"),
            ) { params, _ ->
                val edges = params.edges(leading = "left", trailing = "right")
                GlanceModifier.absolutePadding(edges[0].dp, edges[1].dp, edges[2].dp, edges[3].dp)
            },
        "width" to
            VoltraModifierDefinition(setOf("width")) { params, _ ->
                GlanceModifier.width(params.requiredDp("width").dp)
            },
        "height" to
            VoltraModifierDefinition(setOf("height")) { params, _ ->
                GlanceModifier.height(params.requiredDp("height").dp)
            },
        "size" to
            VoltraModifierDefinition(setOf("width", "height")) { params, _ ->
                GlanceModifier.size(params.requiredDp("width").dp, params.requiredDp("height").dp)
            },
        "fillMaxWidth" to VoltraModifierDefinition(emptySet()) { _, _ -> GlanceModifier.fillMaxWidth() },
        "fillMaxHeight" to VoltraModifierDefinition(emptySet()) { _, _ -> GlanceModifier.fillMaxHeight() },
        "fillMaxSize" to VoltraModifierDefinition(emptySet()) { _, _ -> GlanceModifier.fillMaxSize() },
        "wrapContentWidth" to VoltraModifierDefinition(emptySet()) { _, _ -> GlanceModifier.wrapContentWidth() },
        "wrapContentHeight" to VoltraModifierDefinition(emptySet()) { _, _ -> GlanceModifier.wrapContentHeight() },
        "wrapContentSize" to VoltraModifierDefinition(emptySet()) { _, _ -> GlanceModifier.wrapContentSize() },
        "background" to VoltraModifierDefinition(setOf("color", "day", "night"), ::backgroundModifier),
        "cornerRadius" to
            VoltraModifierDefinition(setOf("radius")) { params, _ ->
                val radius = params.requiredDp("radius")
                // Glance only honours cornerRadius on Android 12+ and logs a warning below it.
                if (Build.VERSION.SDK_INT >=
                    Build.VERSION_CODES.S
                ) {
                    GlanceModifier.cornerRadius(radius.dp)
                } else {
                    GlanceModifier
                }
            },
        "visibility" to
            VoltraModifierDefinition(setOf("visibility")) { params, _ ->
                val visibility =
                    when (params.requiredString("visibility")) {
                        "visible" -> Visibility.Visible
                        "invisible" -> Visibility.Invisible
                        "gone" -> Visibility.Gone
                        else -> throw VoltraModifierException("Invalid visibility")
                    }
                GlanceModifier.visibility(visibility)
            },
        "semantics" to
            VoltraModifierDefinition(setOf("contentDescription", "testTag")) { params, _ ->
                val description = params.optionalString("contentDescription")
                val tag = params.optionalString("testTag")
                if (description == null && tag == null) {
                    throw VoltraModifierException("semantics needs contentDescription or testTag")
                }
                GlanceModifier.semantics {
                    description?.let { contentDescription = it }
                    tag?.let { testTag = it }
                }
            },
        "appWidgetBackground" to
            VoltraModifierDefinition(emptySet()) { _, scope ->
                // Glance fails the whole widget when two views are marked; keep the first one.
                if (!scope.claimAppWidgetBackground()) {
                    throw VoltraModifierException("appWidgetBackground is already set on another component")
                }
                GlanceModifier.appWidgetBackground()
            },
    )

/** Start, top, end, bottom in dp; the most specific key wins over its axis, which wins over `all`. */
private fun Map<String, Any?>.edges(
    leading: String,
    trailing: String,
): List<Float> {
    val all = optionalDp("all") ?: 0f
    val horizontal = optionalDp("horizontal") ?: all
    val vertical = optionalDp("vertical") ?: all
    return listOf(
        optionalDp(leading) ?: horizontal,
        optionalDp("top") ?: vertical,
        optionalDp(trailing) ?: horizontal,
        optionalDp("bottom") ?: vertical,
    )
}

private fun backgroundModifier(
    params: Map<String, Any?>,
    scope: VoltraModifierScope,
): GlanceModifier {
    if (params.containsKey("color")) {
        if (params.containsKey("day") || params.containsKey("night")) {
            throw VoltraModifierException("background takes either color or day and night")
        }
        return GlanceModifier.background(scope.colorProvider(params.requiredColor("color")))
    }
    // Glance's day/night provider takes two concrete colors, so theme tokens are not accepted here.
    val day = params.requiredColor("day") as? VoltraColorValue.Static ?: throw VoltraModifierException("Invalid day")
    val night =
        params.requiredColor("night") as? VoltraColorValue.Static ?: throw VoltraModifierException("Invalid night")
    return GlanceModifier.background(ColorProvider(day = day.color, night = night.color))
}
