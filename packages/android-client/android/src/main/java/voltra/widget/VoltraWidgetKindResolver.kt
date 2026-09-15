package voltra.widget

import android.content.Context
import android.util.Log

/** Result of resolving a widget id's [VoltraWidgetKind]. */
sealed interface VoltraWidgetKindResolution {
    data class Resolved(
        val kind: VoltraWidgetKind,
    ) : VoltraWidgetKindResolution

    /** Reflection or lookup failure, reported explicitly rather than defaulting to a kind. */
    data class Unresolved(
        val reason: String,
    ) : VoltraWidgetKindResolution
}

/**
 * Resolves a widget id's [VoltraWidgetKind] by instantiating its generated receiver class and
 * reading [VoltraWidgetReceiver.widgetKind]. Works in a fresh process before any widget instance
 * has been placed: it reuses the receiver class-name lookup ([VoltraWidgetReceivers]) but
 * never touches [VoltraWidgetReceiver]'s Glance-widget registry, so resolving a kind has no side
 * effects on it.
 *
 * Reflection or lookup failure is reported as [VoltraWidgetKindResolution.Unresolved], never as
 * either kind (ADR 0000): a class-not-found or instantiation failure is not evidence of a
 * particular kind. Failure is caught as [Throwable], not [Exception]: a missing native
 * dependency surfaces as [NoClassDefFoundError] or [ExceptionInInitializerError], neither of
 * which is an [Exception], and either must still resolve to [Unresolved] rather than escape.
 */
object VoltraWidgetKindResolver {
    private const val TAG = "VoltraWidgetKindResolver"

    fun resolve(
        context: Context,
        widgetId: String,
    ): VoltraWidgetKindResolution =
        resolveFromReceiverClassName(VoltraWidgetReceivers.className(context, widgetId), widgetId)

    private fun resolveFromReceiverClassName(
        receiverClassName: String,
        widgetId: String,
    ): VoltraWidgetKindResolution =
        try {
            when (val receiver = Class.forName(receiverClassName).getDeclaredConstructor().newInstance()) {
                is VoltraWidgetReceiver -> {
                    VoltraWidgetKindResolution.Resolved(receiver.widgetKind)
                }

                else -> {
                    VoltraWidgetKindResolution.Unresolved(
                        "Class '$receiverClassName' for widget '$widgetId' is not a VoltraWidgetReceiver",
                    )
                }
            }
        } catch (e: Throwable) {
            Log.w(TAG, "Could not resolve widget kind for '$widgetId': ${e.message}")
            VoltraWidgetKindResolution.Unresolved(
                "No widget registered for id '$widgetId' (receiver class '$receiverClassName' " +
                    "could not be loaded: ${e.message})",
            )
        }
}
