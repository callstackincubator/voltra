package voltra.styling

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
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
}

@Composable
fun VoltraThemeColorRole.toColorProvider(): ColorProvider =
    when (this) {
        VoltraThemeColorRole.PRIMARY -> GlanceTheme.colors.primary
        VoltraThemeColorRole.ON_PRIMARY -> GlanceTheme.colors.onPrimary
        VoltraThemeColorRole.PRIMARY_CONTAINER -> GlanceTheme.colors.primaryContainer
        VoltraThemeColorRole.ON_PRIMARY_CONTAINER -> GlanceTheme.colors.onPrimaryContainer
        VoltraThemeColorRole.SECONDARY -> GlanceTheme.colors.secondary
        VoltraThemeColorRole.ON_SECONDARY -> GlanceTheme.colors.onSecondary
        VoltraThemeColorRole.SECONDARY_CONTAINER -> GlanceTheme.colors.secondaryContainer
        VoltraThemeColorRole.ON_SECONDARY_CONTAINER -> GlanceTheme.colors.onSecondaryContainer
        VoltraThemeColorRole.TERTIARY -> GlanceTheme.colors.tertiary
        VoltraThemeColorRole.ON_TERTIARY -> GlanceTheme.colors.onTertiary
        VoltraThemeColorRole.TERTIARY_CONTAINER -> GlanceTheme.colors.tertiaryContainer
        VoltraThemeColorRole.ON_TERTIARY_CONTAINER -> GlanceTheme.colors.onTertiaryContainer
        VoltraThemeColorRole.ERROR -> GlanceTheme.colors.error
        VoltraThemeColorRole.ERROR_CONTAINER -> GlanceTheme.colors.errorContainer
        VoltraThemeColorRole.ON_ERROR -> GlanceTheme.colors.onError
        VoltraThemeColorRole.ON_ERROR_CONTAINER -> GlanceTheme.colors.onErrorContainer
        VoltraThemeColorRole.BACKGROUND -> GlanceTheme.colors.background
        VoltraThemeColorRole.ON_BACKGROUND -> GlanceTheme.colors.onBackground
        VoltraThemeColorRole.SURFACE -> GlanceTheme.colors.surface
        VoltraThemeColorRole.ON_SURFACE -> GlanceTheme.colors.onSurface
        VoltraThemeColorRole.SURFACE_VARIANT -> GlanceTheme.colors.surfaceVariant
        VoltraThemeColorRole.ON_SURFACE_VARIANT -> GlanceTheme.colors.onSurfaceVariant
        VoltraThemeColorRole.OUTLINE -> GlanceTheme.colors.outline
        VoltraThemeColorRole.INVERSE_ON_SURFACE -> GlanceTheme.colors.inverseOnSurface
        VoltraThemeColorRole.INVERSE_SURFACE -> GlanceTheme.colors.inverseSurface
        VoltraThemeColorRole.INVERSE_PRIMARY -> GlanceTheme.colors.inversePrimary
        VoltraThemeColorRole.WIDGET_BACKGROUND -> GlanceTheme.colors.widgetBackground
    }

@Composable
fun VoltraColorValue.toColorProvider(): ColorProvider =
    when (this) {
        is VoltraColorValue.Dynamic -> role.toColorProvider()
        is VoltraColorValue.Static -> ColorProvider(color)
    }

@Composable
fun VoltraColorValue.resolveColor(context: Context = LocalContext.current): Color =
    when (this) {
        is VoltraColorValue.Dynamic -> role.toColorProvider().getColor(context)
        is VoltraColorValue.Static -> color
    }
