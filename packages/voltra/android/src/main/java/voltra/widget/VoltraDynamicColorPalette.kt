package voltra.widget

import android.content.Context
import androidx.compose.ui.graphics.toArgb
import androidx.glance.color.ColorProviders
import androidx.glance.color.DynamicThemeColorProviders
import androidx.glance.unit.ColorProvider
import java.util.Locale

object VoltraDynamicColorPalette {
    private val colorKeys =
        listOf(
            "primary",
            "onPrimary",
            "primaryContainer",
            "onPrimaryContainer",
            "secondary",
            "onSecondary",
            "secondaryContainer",
            "onSecondaryContainer",
            "tertiary",
            "onTertiary",
            "tertiaryContainer",
            "onTertiaryContainer",
            "error",
            "errorContainer",
            "onError",
            "onErrorContainer",
            "background",
            "onBackground",
            "surface",
            "onSurface",
            "surfaceVariant",
            "onSurfaceVariant",
            "outline",
            "inverseOnSurface",
            "inverseSurface",
            "inversePrimary",
            "widgetBackground",
        )

    private fun collectColorProviders(colors: ColorProviders): List<ColorProvider> =
        listOf(
            colors.primary,
            colors.onPrimary,
            colors.primaryContainer,
            colors.onPrimaryContainer,
            colors.secondary,
            colors.onSecondary,
            colors.secondaryContainer,
            colors.onSecondaryContainer,
            colors.tertiary,
            colors.onTertiary,
            colors.tertiaryContainer,
            colors.onTertiaryContainer,
            colors.error,
            colors.errorContainer,
            colors.onError,
            colors.onErrorContainer,
            colors.background,
            colors.onBackground,
            colors.surface,
            colors.onSurface,
            colors.surfaceVariant,
            colors.onSurfaceVariant,
            colors.outline,
            colors.inverseOnSurface,
            colors.inverseSurface,
            colors.inversePrimary,
            colors.widgetBackground,
        )

    private fun colorProviderToHex(
        colorProvider: ColorProvider,
        context: Context,
    ): String {
        val argb = colorProvider.getColor(context).toArgb()
        val red = (argb shr 16) and 0xFF
        val green = (argb shr 8) and 0xFF
        val blue = argb and 0xFF
        val alpha = (argb ushr 24) and 0xFF

        return String.format(Locale.US, "#%02x%02x%02x%02x", red, green, blue, alpha)
    }

    fun snapshotColorArray(context: Context): List<String> {
        val colors = DynamicThemeColorProviders
        return collectColorProviders(colors).map { provider ->
            colorProviderToHex(provider, context)
        }
    }

    fun snapshotColorMap(context: Context): Map<String, String> =
        colorKeys.zip(snapshotColorArray(context)).toMap()

    fun toQueryValue(context: Context): String =
        snapshotColorArray(context).joinToString(
            prefix = "[\"",
            separator = "\",\"",
            postfix = "\"]",
        )
}
