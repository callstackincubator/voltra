package voltra.ongoingnotification

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

/** Minimum API level on which a notification can be promoted (Android 16). */
internal const val PROMOTION_MIN_SDK = 36

/**
 * The extras bit that requests promotion. `Builder.setRequestPromotedOngoing` was added
 * in SDK 36.1 while Live Update devices start at 36.0, so the documented extras key stays
 * the mechanism and must keep matching `Notification.EXTRA_REQUEST_PROMOTED_ONGOING`
 * ("android.requestPromotedOngoing") — a test pins the value.
 */
internal const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"

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
) {
    fun evaluate(
        payload: AndroidOngoingNotificationPayload,
        channelId: String?,
        notification: Notification?,
    ): AndroidOngoingNotificationPromotionInfo {
        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
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

        if (hasPromotableCharacteristics == false) {
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
