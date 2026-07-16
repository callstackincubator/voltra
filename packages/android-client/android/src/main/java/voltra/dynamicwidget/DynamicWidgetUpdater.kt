package voltra.dynamicwidget

internal fun interface DynamicWidgetPropsPersistence {
    fun persistDynamicWidgetProps(
        dynamicWidgetId: String,
        dynamicWidgetPropsJson: String,
    )
}

internal fun interface DynamicWidgetUpdateTrigger {
    suspend fun triggerDynamicWidgetUpdate(dynamicWidgetId: String)
}

/** Persists runtime props before asking Glance to re-render a Dynamic Widget. */
internal class DynamicWidgetUpdater(
    private val dynamicWidgetPropsPersistence: DynamicWidgetPropsPersistence,
    private val dynamicWidgetUpdateTrigger: DynamicWidgetUpdateTrigger,
) {
    suspend fun updateDynamicWidget(
        dynamicWidgetId: String,
        dynamicWidgetPropsJson: String,
    ) {
        dynamicWidgetPropsPersistence.persistDynamicWidgetProps(
            dynamicWidgetId = dynamicWidgetId,
            dynamicWidgetPropsJson = dynamicWidgetPropsJson,
        )
        dynamicWidgetUpdateTrigger.triggerDynamicWidgetUpdate(dynamicWidgetId)
    }
}
