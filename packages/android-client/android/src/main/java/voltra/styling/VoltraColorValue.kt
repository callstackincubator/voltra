package voltra.styling

import android.content.Context
import android.content.res.Configuration
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.color.ColorProviders
import androidx.glance.unit.ColorProvider

enum class VoltraThemeColorRole(
    val token: String,
) {
    PRIMARY("~p"),
    ON_PRIMARY("~op"),
    PRIMARY_CONTAINER("~pc"),
    ON_PRIMARY_CONTAINER("~opc"),
    SECONDARY("~s"),
    ON_SECONDARY("~os"),
    SECONDARY_CONTAINER("~sc"),
    ON_SECONDARY_CONTAINER("~osc"),
    TERTIARY("~t"),
    ON_TERTIARY("~ot"),
    TERTIARY_CONTAINER("~tc"),
    ON_TERTIARY_CONTAINER("~otc"),
    ERROR("~e"),
    ERROR_CONTAINER("~ec"),
    ON_ERROR("~oe"),
    ON_ERROR_CONTAINER("~oec"),
    BACKGROUND("~b"),
    ON_BACKGROUND("~ob"),
    SURFACE("~sf"),
    ON_SURFACE("~osf"),
    SURFACE_VARIANT("~sv"),
    ON_SURFACE_VARIANT("~osv"),
    OUTLINE("~ol"),
    INVERSE_ON_SURFACE("~ios"),
    INVERSE_SURFACE("~is"),
    INVERSE_PRIMARY("~ip"),
    WIDGET_BACKGROUND("~wb"),
    ;

    companion object {
        fun fromToken(token: String): VoltraThemeColorRole? = entries.firstOrNull { it.token == token }
    }
}

sealed interface VoltraColorValue {
    data class Static(
        val color: Color,
    ) : VoltraColorValue

    data class Dynamic(
        val role: VoltraThemeColorRole,
    ) : VoltraColorValue

    data class DayNight(
        val day: Color,
        val night: Color,
    ) : VoltraColorValue
}

@Composable
fun VoltraThemeColorRole.toColorProvider(): ColorProvider = toColorProvider(GlanceTheme.colors)

/** Resolves the role against an already-read theme, so code outside composition can use it. */
fun VoltraThemeColorRole.toColorProvider(colors: ColorProviders): ColorProvider =
    when (this) {
        VoltraThemeColorRole.PRIMARY -> colors.primary
        VoltraThemeColorRole.ON_PRIMARY -> colors.onPrimary
        VoltraThemeColorRole.PRIMARY_CONTAINER -> colors.primaryContainer
        VoltraThemeColorRole.ON_PRIMARY_CONTAINER -> colors.onPrimaryContainer
        VoltraThemeColorRole.SECONDARY -> colors.secondary
        VoltraThemeColorRole.ON_SECONDARY -> colors.onSecondary
        VoltraThemeColorRole.SECONDARY_CONTAINER -> colors.secondaryContainer
        VoltraThemeColorRole.ON_SECONDARY_CONTAINER -> colors.onSecondaryContainer
        VoltraThemeColorRole.TERTIARY -> colors.tertiary
        VoltraThemeColorRole.ON_TERTIARY -> colors.onTertiary
        VoltraThemeColorRole.TERTIARY_CONTAINER -> colors.tertiaryContainer
        VoltraThemeColorRole.ON_TERTIARY_CONTAINER -> colors.onTertiaryContainer
        VoltraThemeColorRole.ERROR -> colors.error
        VoltraThemeColorRole.ERROR_CONTAINER -> colors.errorContainer
        VoltraThemeColorRole.ON_ERROR -> colors.onError
        VoltraThemeColorRole.ON_ERROR_CONTAINER -> colors.onErrorContainer
        VoltraThemeColorRole.BACKGROUND -> colors.background
        VoltraThemeColorRole.ON_BACKGROUND -> colors.onBackground
        VoltraThemeColorRole.SURFACE -> colors.surface
        VoltraThemeColorRole.ON_SURFACE -> colors.onSurface
        VoltraThemeColorRole.SURFACE_VARIANT -> colors.surfaceVariant
        VoltraThemeColorRole.ON_SURFACE_VARIANT -> colors.onSurfaceVariant
        VoltraThemeColorRole.OUTLINE -> colors.outline
        VoltraThemeColorRole.INVERSE_ON_SURFACE -> colors.inverseOnSurface
        VoltraThemeColorRole.INVERSE_SURFACE -> colors.inverseSurface
        VoltraThemeColorRole.INVERSE_PRIMARY -> colors.inversePrimary
        VoltraThemeColorRole.WIDGET_BACKGROUND -> colors.widgetBackground
    }

/**
 * A pair maps to Glance's public day/night provider: from Android 12 the launcher receives both
 * colors and swaps them itself; below that Glance picks a side when the widget is composed.
 */
@Composable
fun VoltraColorValue.toColorProvider(): ColorProvider =
    when (this) {
        is VoltraColorValue.Dynamic -> role.toColorProvider()
        is VoltraColorValue.Static -> ColorProvider(color)
        is VoltraColorValue.DayNight -> androidx.glance.color.ColorProvider(day = day, night = night)
    }

@Composable
fun VoltraColorValue.resolveColor(context: Context = LocalContext.current): Color =
    when (this) {
        is VoltraColorValue.Dynamic -> role.toColorProvider().getColor(context)
        is VoltraColorValue.Static -> color
        is VoltraColorValue.DayNight -> if (context.isNightMode()) night else day
    }

internal fun Context.isNightMode(): Boolean =
    resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
