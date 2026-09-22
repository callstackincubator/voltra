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
    }

fun AndroidOngoingNotificationUpdateResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
        promotion?.let { putMap("promotion", it.toWritableMap()) }
    }

fun AndroidOngoingNotificationUpsertResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
        promotion?.let { putMap("promotion", it.toWritableMap()) }
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

// The pre-flight result type deliberately has no `requested` field: a check is always
// a request, so the key would be an undeclared constant riding along to JS.
fun AndroidOngoingNotificationPromotionInfo.toCheckResultWritableMap() =
    WritableNativeMap().apply {
        putBoolean("eligible", eligible)
        putArray("reasons", Arguments.fromList(reasons))
        hasPromotableCharacteristics?.let { putBoolean("hasPromotableCharacteristics", it) }
    }
