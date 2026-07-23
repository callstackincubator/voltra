package voltra.dynamicwidget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.glance.currentState

internal val dynamicWidgetPropsRevisionKey =
    longPreferencesKey("voltra.dynamic_widget.props_revision")

/**
 * Connects Glance's observable per-instance state to the authoritative SharedPreferences props.
 * The revision causes recomposition; the props store supplies the latest value when updates coalesce.
 */
@Composable
internal fun currentDynamicWidgetRenderInput(
    context: Context,
    dynamicWidgetId: String,
): DynamicWidgetRenderInput =
    DynamicWidgetRenderInput(
        propsRevision = currentState(dynamicWidgetPropsRevisionKey) ?: 0L,
        propsJson = DynamicWidgetPropsStore(context).getDynamicWidgetProps(dynamicWidgetId),
    )
