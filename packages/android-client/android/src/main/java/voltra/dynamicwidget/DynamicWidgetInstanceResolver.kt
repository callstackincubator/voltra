package voltra.dynamicwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.VoltraWidgetReceivers

/**
 * The Android facts [DynamicWidgetInstanceResolver] needs, behind one interface so the rejection
 * table below is unit-tested without a device — the same shape [DynamicWidgetUpdater] uses.
 */
internal interface DynamicWidgetInstanceBoundary {
    /** The provider of a placed app widget, or null when [appWidgetId] is not a placed widget. */
    fun providerComponentName(appWidgetId: Int): ComponentName?

    /** Every generated Voltra receiver this app declares, keyed by widget id. */
    fun installedReceivers(): Map<String, ComponentName>

    fun resolveWidgetKind(widgetId: String): VoltraWidgetKindResolution
}

/** An `appWidgetId` that is not a placement of one of this app's Dynamic Widgets. */
internal sealed class DynamicWidgetInstanceRejection(
    message: String,
) : Exception(message) {
    /** Not a placed widget at all, or not a placement of a Voltra widget this app declares. */
    class InstanceNotFound(
        message: String,
    ) : DynamicWidgetInstanceRejection(message)

    /** A placement of a Voltra widget, but a payload-driven one, which has no configuration. */
    class KindMismatch(
        message: String,
    ) : DynamicWidgetInstanceRejection(message)

    /** A declared receiver whose kind could not be resolved at all. */
    class WidgetNotFound(
        message: String,
    ) : DynamicWidgetInstanceRejection(message)
}

/**
 * Turns an `appWidgetId` handed over the bridge into a validated Voltra widget id, so the
 * per-instance configuration APIs write only to placements this app actually owns.
 *
 * Four steps, in order (ADR 0006):
 *  1. The id must belong to a placed app widget.
 *  2. Its provider must be one of this app's declared Voltra receivers. Anything else is another
 *     app's widget, or a non-Voltra provider of this app's, and is rejected as not found — an app
 *     cannot reach into a placement it does not own by guessing an integer.
 *  3. The widget id is read from that receiver map, never parsed out of the class name against the
 *     package name: the generated receivers live in the Gradle `namespace` package while the
 *     provider carries the `applicationId`, and those differ under product flavors (see
 *     [VoltraWidgetReceivers]).
 *  4. The widget must be a Dynamic Widget. Only Dynamic Widgets read `env.configuration`.
 *
 * Nothing is written before step 4 passes (ADR 0000): a widget id driven through the wrong API
 * fails with a rejected promise instead of leaving state behind.
 */
internal class DynamicWidgetInstanceResolver(
    private val boundary: DynamicWidgetInstanceBoundary,
) {
    /** The Voltra widget id [appWidgetId] is a placement of, or throws a rejection explaining why not. */
    fun resolveDynamicWidgetId(appWidgetId: Int): String {
        val provider =
            boundary.providerComponentName(appWidgetId)
                ?: throw DynamicWidgetInstanceRejection.InstanceNotFound(
                    "No widget is placed with appWidgetId $appWidgetId. Read the current placements " +
                        "with getActiveWidgets() and use an entry's appWidgetId.",
                )

        val widgetId =
            boundary
                .installedReceivers()
                .entries
                .firstOrNull { it.value == provider }
                ?.key
                ?: throw DynamicWidgetInstanceRejection.InstanceNotFound(
                    "The widget placed with appWidgetId $appWidgetId is provided by " +
                        "'${provider.flattenToShortString()}', which is not one of this app's Voltra " +
                        "widget receivers. It belongs to another app or to a non-Voltra provider.",
                )

        when (val resolution = boundary.resolveWidgetKind(widgetId)) {
            is VoltraWidgetKindResolution.Resolved -> {
                if (resolution.kind != VoltraWidgetKind.Dynamic) {
                    throw DynamicWidgetInstanceRejection.KindMismatch(
                        "Widget '$widgetId' is a payload-driven widget and has no configuration. " +
                            "Per-instance configuration only applies to Dynamic Widgets.",
                    )
                }
            }

            is VoltraWidgetKindResolution.Unresolved -> {
                throw DynamicWidgetInstanceRejection.WidgetNotFound(resolution.reason)
            }
        }

        return widgetId
    }
}

/** The real Android collaborators, used everywhere outside tests. */
internal class AndroidDynamicWidgetInstanceBoundary(
    private val context: Context,
) : DynamicWidgetInstanceBoundary {
    override fun providerComponentName(appWidgetId: Int): ComponentName? =
        AppWidgetManager.getInstance(context).getAppWidgetInfo(appWidgetId)?.provider

    override fun installedReceivers(): Map<String, ComponentName> = VoltraWidgetReceivers.installedReceivers(context)

    override fun resolveWidgetKind(widgetId: String): VoltraWidgetKindResolution =
        VoltraWidgetKindResolver.resolve(context, widgetId)
}
