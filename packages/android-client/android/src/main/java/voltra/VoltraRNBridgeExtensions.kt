package voltra

import android.util.Log
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableNativeMap
import voltra.ongoingnotification.AndroidOngoingNotificationOption
import voltra.ongoingnotification.AndroidOngoingNotificationPresentationUpdate

private const val TAG = "VoltraRNBridge"

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
        // Presentation options distinguish an absent key from an explicit null, so they cannot use
        // the hasKey-only reads above; those predate clearing and keep their merge behaviour.
        presentation =
            AndroidOngoingNotificationPresentationUpdate(
                visibility = map.stringOption("visibility"),
                color = map.stringOption("color"),
                category = map.stringOption("category"),
                timeoutMs = map.longOption("timeoutMs"),
                localOnly = map.booleanOption("localOnly"),
                group = map.stringOption("group"),
                sortKey = map.stringOption("sortKey"),
                allowSystemGeneratedContextualActions = map.booleanOption("allowSystemGeneratedContextualActions"),
            ),
        alert = map.booleanValueOrNull("alert"),
    )

/**
 * Reads an option that describes this one post rather than the notification's lifetime. `alert` is
 * the only one: absent, null and `false` all mean "post silently", so it needs two states, not three.
 */
private fun ReadableMap.booleanValueOrNull(key: String): Boolean? =
    when (val option = booleanOption(key)) {
        is AndroidOngoingNotificationOption.Value -> option.value
        else -> null
    }

/**
 * Reads one option in its three states: absent, explicitly null, or present with a value.
 *
 * A value of the wrong type is dropped rather than thrown: JavaScript validates the shape of every
 * options object before it reaches here, so the only way to hit this is a hand-written bridge call
 * or a release older than the option, and neither is worth crashing a notification post over.
 */
private fun <T> ReadableMap.option(
    key: String,
    expected: ReadableType,
    read: ReadableMap.() -> T?,
): AndroidOngoingNotificationOption<T> =
    when {
        !hasKey(key) -> {
            AndroidOngoingNotificationOption.Unset
        }

        isNull(key) -> {
            AndroidOngoingNotificationOption.Cleared
        }

        getType(key) != expected -> {
            Log.w(TAG, "Ignoring ongoing notification option \"$key\": expected $expected, got ${getType(key)}.")
            AndroidOngoingNotificationOption.Unset
        }

        else -> {
            read()?.let { AndroidOngoingNotificationOption.Value(it) }
                ?: AndroidOngoingNotificationOption.Unset
        }
    }

private fun ReadableMap.stringOption(key: String): AndroidOngoingNotificationOption<String> =
    option(key, ReadableType.String) { getString(key) }

private fun ReadableMap.booleanOption(key: String): AndroidOngoingNotificationOption<Boolean> =
    option(key, ReadableType.Boolean) { getBoolean(key) }

private fun ReadableMap.longOption(key: String): AndroidOngoingNotificationOption<Long> =
    option(key, ReadableType.Number) { getDouble(key).toLong() }

fun AndroidOngoingNotificationStartResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
    }

fun AndroidOngoingNotificationUpdateResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
    }

fun AndroidOngoingNotificationUpsertResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
    }

fun AndroidOngoingNotificationStopResult.toWritableMap() =
    WritableNativeMap().apply {
        putBoolean("ok", ok)
        putString("notificationId", notificationId)
        action?.let { putString("action", it) }
        reason?.let { putString("reason", it) }
    }
