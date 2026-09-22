package voltra

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import voltra.ongoingnotification.AndroidOngoingNotificationPromotionInfo

fun AndroidOngoingNotificationOptions(map: ReadableMap) =
    AndroidOngoingNotificationOptions(
        notificationId = map.takeIf { it.hasKey("notificationId") }?.getString("notificationId"),
        channelId = map.takeIf { it.hasKey("channelId") }?.getString("channelId"),
        smallIcon = map.takeIf { it.hasKey("smallIcon") }?.getString("smallIcon"),
        deepLinkUrl = map.takeIf { it.hasKey("deepLinkUrl") }?.getString("deepLinkUrl"),
        requestPromotedOngoing =
            map
                .takeIf { it.hasKey("requestPromotedOngoing") }
                ?.getBoolean("requestPromotedOngoing"),
        fallbackBehavior = map.takeIf { it.hasKey("fallbackBehavior") }?.getString("fallbackBehavior"),
    )

fun AndroidOngoingNotificationStartResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
        promotion?.let { putMap("promotion", it.toWritableMap()) }
        styleFallback?.let { putString("styleFallback", it) }
    }

fun AndroidOngoingNotificationUpdateResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
        promotion?.let { putMap("promotion", it.toWritableMap()) }
        styleFallback?.let { putString("styleFallback", it) }
    }

fun AndroidOngoingNotificationUpsertResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
        promotion?.let { putMap("promotion", it.toWritableMap()) }
        styleFallback?.let { putString("styleFallback", it) }
    }

fun AndroidOngoingNotificationStopResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
    }

fun AndroidOngoingNotificationPromotionInfo.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("requested", requested)
        putBoolean("eligible", eligible)
        putArray("reasons", Arguments.fromList(reasons))
        hasPromotableCharacteristics?.let { putBoolean("hasPromotableCharacteristics", it) }
    }
