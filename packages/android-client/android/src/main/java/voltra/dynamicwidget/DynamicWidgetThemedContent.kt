package voltra.dynamicwidget

import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.glance.GlanceTheme
import voltra.glance.GlanceFactory
import voltra.models.VoltraNode

/**
 * Renders a Dynamic Widget's [node] inside the theme its bundle exports ([themeJSON], as read by
 * [VoltraJSRenderer.themeJSON]), so role tokens such as `~p` resolve to the theme's colors.
 *
 * Without a theme, or from Android 12 when the theme leaves `dynamicColors` on, the node renders
 * exactly as it would without this wrapper. Roles the theme does not define keep the palette in
 * scope here. [GlanceFactory] itself stays theme-free, so payload-driven widgets never see this.
 */
@Composable
internal fun DynamicWidgetThemedContent(
    themeJSON: String?,
    node: VoltraNode,
    factory: GlanceFactory,
) {
    val theme = remember(themeJSON) { DynamicWidgetTheme.parse(themeJSON) }
    val systemPaletteWins = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && theme?.dynamicColors == true
    if (theme == null || systemPaletteWins) {
        factory.Render(node)
        return
    }

    GlanceTheme(colors = theme.toColorProviders(fallback = GlanceTheme.colors)) {
        factory.Render(node)
    }
}
