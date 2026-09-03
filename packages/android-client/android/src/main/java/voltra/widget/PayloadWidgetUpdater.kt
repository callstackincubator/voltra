package voltra.widget

import android.util.Log

/** Resolves a widget id's [VoltraWidgetKind]. Injectable so [PayloadWidgetUpdater] is testable. */
internal fun interface PayloadWidgetKindResolver {
    fun resolvePayloadWidgetKind(widgetId: String): VoltraWidgetKindResolution
}

internal fun interface PayloadWidgetPersistence {
    fun persistPayloadWidgetData(
        widgetId: String,
        jsonString: String,
        deepLinkUrl: String?,
    )
}

internal fun interface PayloadWidgetUpdateTrigger {
    suspend fun triggerPayloadWidgetUpdate(widgetId: String)
}

/** A widget id was resolved but is a Dynamic Widget, not a payload-driven one. */
internal sealed class PayloadWidgetUpdateRejection(
    message: String,
) : Exception(message) {
    class KindMismatch(
        message: String,
    ) : PayloadWidgetUpdateRejection(message)
}

/**
 * Resolves the widget's kind, then persists the payload before triggering a widget update.
 * Mirrors [voltra.dynamicwidget.DynamicWidgetUpdater]'s check-before-persist shape for the
 * payload-driven side (ADR 0000): nothing is persisted before the kind check passes.
 *
 * An [VoltraWidgetKindResolution.Unresolved] id does not reject: rejecting unknown ids from
 * `updateAndroidWidget` would be a breaking change for the payload API, which has always accepted
 * them, so this only guards against the one behavior change introduced by ADR 0000 -- a Dynamic
 * Widget silently absorbing payload state. An unresolved id is logged and treated as before.
 */
internal class PayloadWidgetUpdater(
    private val payloadWidgetKindResolver: PayloadWidgetKindResolver,
    private val payloadWidgetPersistence: PayloadWidgetPersistence,
    private val payloadWidgetUpdateTrigger: PayloadWidgetUpdateTrigger,
) {
    companion object {
        private const val TAG = "PayloadWidgetUpdater"
    }

    suspend fun updatePayloadWidget(
        widgetId: String,
        jsonString: String,
        deepLinkUrl: String?,
    ) {
        when (val resolution = payloadWidgetKindResolver.resolvePayloadWidgetKind(widgetId)) {
            is VoltraWidgetKindResolution.Resolved -> {
                if (resolution.kind != VoltraWidgetKind.Payload) {
                    throw PayloadWidgetUpdateRejection.KindMismatch(
                        "Widget '$widgetId' is a Dynamic Widget (entry-based). Use " +
                            "updateAndroidDynamicWidget to pass props; updateAndroidWidget only " +
                            "drives payload-driven widgets.",
                    )
                }
            }

            is VoltraWidgetKindResolution.Unresolved -> {
                Log.w(
                    TAG,
                    "Could not resolve kind for widget '$widgetId': ${resolution.reason}; " +
                        "proceeding as updateAndroidWidget did before ADR 0000",
                )
            }
        }

        payloadWidgetPersistence.persistPayloadWidgetData(widgetId, jsonString, deepLinkUrl)
        payloadWidgetUpdateTrigger.triggerPayloadWidgetUpdate(widgetId)
    }
}
