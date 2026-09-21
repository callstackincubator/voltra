package voltra.dynamicwidget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.glance.currentState
import kotlinx.coroutines.runBlocking
import voltra.widget.server.WidgetScope

internal val dynamicWidgetPropsRevisionKey =
    longPreferencesKey("voltra.dynamic_widget.props_revision")

/**
 * Bumped whenever the app writes configuration, for the same reason the props revision exists.
 *
 * `GlanceAppWidget.update` on a widget with a live session only reloads Glance state and
 * recomposes; it does not re-run `provideGlance`. A configuration value read in `provideGlance` and
 * captured by the `provideContent` lambda is therefore frozen for the life of the session, so a
 * write stayed invisible until the session idled out (~10-13 s after the last render) and the next
 * update re-ran `provideGlance`. Making the configuration depend on this key moves the read into
 * the composition, where a bump forces it to happen again.
 */
internal val dynamicWidgetConfigurationRevisionKey =
    longPreferencesKey("voltra.dynamic_widget.configuration_revision")

/**
 * Connects Glance's observable per-instance state to the authoritative SharedPreferences props.
 * The revision causes recomposition; the props store supplies the latest value when updates coalesce.
 */
@Composable
internal fun currentDynamicWidgetRenderInput(
    context: Context,
    dynamicWidgetId: String,
    scope: WidgetScope = WidgetScope.of(dynamicWidgetId),
): DynamicWidgetRenderInput =
    DynamicWidgetRenderInput(
        propsRevision = currentState(dynamicWidgetPropsRevisionKey) ?: 0L,
        // Reads the instance slot for `scope`'s key, falling back to the widget slot when the
        // placement has not fetched yet or has no configuration (ADR 0007).
        propsJson = DynamicWidgetPropsStore(context).getDynamicWidgetProps(scope),
    )

/**
 * The configuration this composition renders with, re-read whenever
 * [dynamicWidgetConfigurationRevisionKey] advances.
 *
 * [initialConfiguration] is what `provideGlance` already read off the composition, so the first
 * composition of a session costs no blocking read. Only a revision bump seen *during* a session
 * triggers a re-read; that read runs on Glance's background session thread, and the DataStore is
 * memory-cached after its first load, so blocking there is cheap.
 */
@Composable
internal fun currentDynamicWidgetConfiguration(
    context: Context,
    dynamicWidgetId: String,
    dynamicWidgetAppWidgetId: Int?,
    initialConfiguration: Map<String, String>,
): Map<String, String> {
    val configurationRevision = currentState(dynamicWidgetConfigurationRevisionKey) ?: 0L
    // The revision as it stood when this composition began; captured once, so it survives
    // recomposition while the session lives.
    val initialConfigurationRevision = remember { configurationRevision }

    return remember(configurationRevision) {
        if (configurationRevision == initialConfigurationRevision) {
            initialConfiguration
        } else {
            runBlocking {
                VoltraConfigurationStore(context).get(dynamicWidgetId, dynamicWidgetAppWidgetId)
            }
        }
    }
}
