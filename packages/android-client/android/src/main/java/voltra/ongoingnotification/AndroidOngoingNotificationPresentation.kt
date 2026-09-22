package voltra.ongoingnotification

import android.app.Notification
import android.app.Notification.Builder
import android.os.Build
import android.util.Log
import androidx.compose.ui.graphics.toArgb
import kotlinx.serialization.Serializable
import voltra.styling.JSColorParser
import voltra.styling.VoltraColorValue

private const val TAG = "VoltraNotifPresent"

/**
 * How the system should treat one ongoing notification for its whole lifetime.
 *
 * These are the fields an app decides once and keeps, which is why they are persisted with the
 * record instead of travelling in the payload: losing them on an update would be a bug, and a
 * server that only renders payloads has no business deciding them. What the notification says
 * right now lives in [AndroidOngoingNotificationPayload] instead.
 *
 * Every field is nullable with `null` meaning "not set", so a record written before these fields
 * existed decodes unchanged.
 */
@Serializable
data class AndroidOngoingNotificationPresentation(
    val visibility: String? = null,
    val color: String? = null,
    val category: String? = null,
    val timeoutMs: Long? = null,
    val localOnly: Boolean? = null,
    val group: String? = null,
    val sortKey: String? = null,
    val allowSystemGeneratedContextualActions: Boolean? = null,
) {
    /**
     * Applies one update on top of this presentation, keeping the fields the update does not
     * mention and clearing the ones it sends as `null`.
     *
     * @throws IllegalArgumentException when the update sets a `color` this release cannot resolve,
     *   before anything is posted or stored.
     */
    fun mergedWith(update: AndroidOngoingNotificationPresentationUpdate): AndroidOngoingNotificationPresentation {
        val color = update.color.mergedWith(this.color)
        color?.let { requireAndroidOngoingNotificationColor(it) }

        return AndroidOngoingNotificationPresentation(
            visibility = update.visibility.mergedWith(visibility),
            color = color,
            category = update.category.mergedWith(category),
            timeoutMs = update.timeoutMs.mergedWith(timeoutMs),
            localOnly = update.localOnly.mergedWith(localOnly),
            group = update.group.mergedWith(group),
            sortKey = update.sortKey.mergedWith(sortKey),
            allowSystemGeneratedContextualActions =
                update.allowSystemGeneratedContextualActions
                    .mergedWith(allowSystemGeneratedContextualActions),
        )
    }
}

/** The same fields as [AndroidOngoingNotificationPresentation], in the three states an update can send. */
data class AndroidOngoingNotificationPresentationUpdate(
    val visibility: AndroidOngoingNotificationOption<String> = AndroidOngoingNotificationOption.Unset,
    val color: AndroidOngoingNotificationOption<String> = AndroidOngoingNotificationOption.Unset,
    val category: AndroidOngoingNotificationOption<String> = AndroidOngoingNotificationOption.Unset,
    val timeoutMs: AndroidOngoingNotificationOption<Long> = AndroidOngoingNotificationOption.Unset,
    val localOnly: AndroidOngoingNotificationOption<Boolean> = AndroidOngoingNotificationOption.Unset,
    val group: AndroidOngoingNotificationOption<String> = AndroidOngoingNotificationOption.Unset,
    val sortKey: AndroidOngoingNotificationOption<String> = AndroidOngoingNotificationOption.Unset,
    val allowSystemGeneratedContextualActions:
        AndroidOngoingNotificationOption<Boolean> = AndroidOngoingNotificationOption.Unset,
)

/**
 * Applies the lifetime fields to [this] builder.
 *
 * Category is deliberately absent: its fallback depends on the payload, so the caller resolves it
 * once and shares the result with the public version.
 */
fun Builder.applyAndroidOngoingNotificationPresentation(presentation: AndroidOngoingNotificationPresentation) {
    androidOngoingNotificationVisibility(presentation.visibility)?.let { setVisibility(it) }
    androidOngoingNotificationColor(presentation.color)?.let { setColor(it) }
    presentation.timeoutMs?.let { timeoutMs ->
        // Notification.Builder.setTimeoutAfter is API 26. The value stays on the record, so an
        // app that reinstalls onto 26+ keeps its timeout instead of silently losing it.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            setTimeoutAfter(timeoutMs)
        }
    }
    if (presentation.localOnly == true) {
        setLocalOnly(true)
    }
    presentation.group?.let { setGroup(it) }
    presentation.sortKey?.let { setSortKey(it) }
    presentation.allowSystemGeneratedContextualActions?.let { allowed ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            setAllowSystemGeneratedContextualActions(allowed)
        }
    }
}

/** Resolves a `color` option to ARGB, or null when unset. */
fun androidOngoingNotificationColor(color: String?): Int? =
    (JSColorParser.parse(color) as? VoltraColorValue.Static)?.color?.toArgb()

/**
 * Resolves a `color` option or fails. JavaScript validates the shape of `color`; only this
 * release knows whether a string is a static color rather than a dynamic color token, so the
 * native side is the last place that can reject it before it is stored.
 */
fun requireAndroidOngoingNotificationColor(color: String): Int =
    androidOngoingNotificationColor(color)
        ?: throw IllegalArgumentException(
            "\"color\" must be a static color such as \"#1E88E5\", \"rgb(30, 136, 229)\" or a color " +
                "name, and not a dynamic color token. Got: $color",
        )

/** Maps the `visibility` option onto a `Notification.VISIBILITY_*` constant. */
fun androidOngoingNotificationVisibility(visibility: String?): Int? =
    when (visibility) {
        null -> null
        "public" -> Notification.VISIBILITY_PUBLIC
        "private" -> Notification.VISIBILITY_PRIVATE
        "secret" -> Notification.VISIBILITY_SECRET
        else -> logUnsupportedOngoingNotificationOption("visibility", visibility)
    }

/**
 * Maps the `category` option onto a notification category.
 *
 * Categories are plain strings, so values newer than the running API level are written as written:
 * `"navigation"` is API 28 and `"workout"`, `"stopwatch"` and `"location_sharing"` are API 31. The
 * system ignores a category it does not know, which is what an older device should do, and naming
 * the constants instead would trip NewApi lint on the older levels.
 */
fun androidOngoingNotificationCategory(category: String?): String? =
    when (category) {
        null -> null
        in supportedAndroidOngoingNotificationCategories -> category
        else -> logUnsupportedOngoingNotificationOption("category", category)
    }

/**
 * The categories Voltra exposes; DND or ranking categories tied to other notification kinds are not
 * here, because Voltra does not post those kinds.
 */
val supportedAndroidOngoingNotificationCategories: Set<String> =
    setOf("progress", "navigation", "transport", "service", "status", "workout", "stopwatch", "location_sharing")

/**
 * A visibility or category this release does not know is ignored rather than rejected: a payload
 * written for a newer release should still be shown by an older device, just without that field.
 */
private fun logUnsupportedOngoingNotificationOption(
    optionName: String,
    value: String,
): Nothing? {
    Log.w(TAG, "Ignoring unsupported ongoing notification $optionName \"$value\".")
    return null
}
