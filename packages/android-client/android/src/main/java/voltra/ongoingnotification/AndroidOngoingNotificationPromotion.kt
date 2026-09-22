package voltra.ongoingnotification

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

/** Minimum API level on which a notification can be promoted (Android 16). */
internal const val PROMOTION_MIN_SDK = 36

/**
 * The extras bit that requests promotion. compileSdk 37 exposes the platform constant,
 * so the key is the framework's own — the contract with the system is pinned against
 * the documented value ("android.requestPromotedOngoing") in a test.
 */
internal val EXTRA_REQUEST_PROMOTED_ONGOING = Notification.EXTRA_REQUEST_PROMOTED_ONGOING

private const val PROMOTED_PERMISSION = "android.permission.POST_PROMOTED_NOTIFICATIONS"

/**
 * The permission behind promoted ongoing notifications. The catch-all return keeps the
 * historical capability semantics: a failing permission read is assumed granted rather
 * than reported as missing.
 */
internal fun hasPromotedNotificationsPermission(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < PROMOTION_MIN_SDK) {
        return false
    }

    return try {
        context.checkSelfPermission(PROMOTED_PERMISSION) == PackageManager.PERMISSION_GRANTED
    } catch (_: Throwable) {
        true
    }
}

/**
 * The closed vocabulary of `promotion.reasons`. Group summary, colorized notifications,
 * custom RemoteViews and disallowed styles are not runtime checks: Voltra never sets
 * them, and the manager tests pin that structurally.
 */
object AndroidOngoingNotificationPromotionIssue {
    const val UNSUPPORTED_API_LEVEL = "unsupported_api_level"
    const val PERMISSION_NOT_DECLARED = "permission_not_declared"
    const val NOTIFICATIONS_DISABLED = "notifications_disabled"
    const val PROMOTION_DISABLED_BY_USER = "promotion_disabled_by_user"
    const val CHANNEL_IMPORTANCE_MIN = "channel_importance_min"
    const val MISSING_TITLE = "missing_title"
    const val NOT_PROMOTABLE = "not_promotable"
}

data class AndroidOngoingNotificationPromotionInfo(
    val requested: Boolean,
    val eligible: Boolean,
    val reasons: List<String>,
    val hasPromotableCharacteristics: Boolean? = null,
)

/**
 * Runs the platform's promotion criteria against the device state, the channel, the
 * payload and the built notification. Called for every post that requests promotion and
 * by the pre-flight check; it never posts and never throws for an ineligible
 * notification — deciding between "return the reasons" and "reject" is the caller's,
 * driven by `fallbackBehavior`.
 */
class AndroidOngoingNotificationPromotionEvaluator(
    private val context: Context,
    private val notificationManager: NotificationManager,
) {
    fun evaluate(
        payload: AndroidOngoingNotificationPayload,
        channelId: String?,
        notification: Notification?,
    ): AndroidOngoingNotificationPromotionInfo {
        val reasons = mutableListOf<String>()
        val promotionSupported = Build.VERSION.SDK_INT >= PROMOTION_MIN_SDK

        if (!promotionSupported) {
            reasons += AndroidOngoingNotificationPromotionIssue.UNSUPPORTED_API_LEVEL
        }

        if (promotionSupported && !hasPromotedNotificationsPermission(context)) {
            reasons += AndroidOngoingNotificationPromotionIssue.PERMISSION_NOT_DECLARED
        }

        if (!notificationManager.areNotificationsEnabled()) {
            reasons += AndroidOngoingNotificationPromotionIssue.NOTIFICATIONS_DISABLED
        }

        if (promotionSupported && !notificationManager.canPostPromotedNotifications()) {
            reasons += AndroidOngoingNotificationPromotionIssue.PROMOTION_DISABLED_BY_USER
        }

        if (channelId != null &&
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            notificationManager.getNotificationChannel(channelId)?.importance == NotificationManager.IMPORTANCE_MIN
        ) {
            reasons += AndroidOngoingNotificationPromotionIssue.CHANNEL_IMPORTANCE_MIN
        }

        if (payload.promotionRequiresTitle && payload.title.isNullOrEmpty()) {
            reasons += AndroidOngoingNotificationPromotionIssue.MISSING_TITLE
        }

        val hasPromotableCharacteristics =
            if (promotionSupported && notification != null) {
                notification.hasPromotableCharacteristics()
            } else {
                null
            }

        // `not_promotable` means "the platform rejected this shape for a reason Voltra
        // did not already name". A missing title fails the platform check for that same
        // missing title, so the platform verdict is not reported a second time next to
        // the specific reason.
        val explainedByAShapeReason = reasons.contains(AndroidOngoingNotificationPromotionIssue.MISSING_TITLE)
        if (hasPromotableCharacteristics == false && !explainedByAShapeReason) {
            reasons += AndroidOngoingNotificationPromotionIssue.NOT_PROMOTABLE
        }

        return AndroidOngoingNotificationPromotionInfo(
            requested = true,
            eligible = reasons.isEmpty(),
            reasons = reasons,
            hasPromotableCharacteristics = hasPromotableCharacteristics,
        )
    }
}
