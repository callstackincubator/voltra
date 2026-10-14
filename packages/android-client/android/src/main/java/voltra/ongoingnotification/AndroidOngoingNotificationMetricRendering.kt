package voltra.ongoingnotification

import android.os.Build
import androidx.annotation.ChecksSdkIntAtLeast
import java.util.Locale

/** `Notification.MetricStyle` is API 37; metrics fall back to a plain text line below it. */
internal const val METRIC_STYLE_MIN_SDK = 37

/**
 * Whether this post can use the platform `MetricStyle`: the device runs API 37+ and the app
 * compiled Voltra against SDK 37+. build.gradle compiles `buildMetricStyle` from
 * `src/main/metricStyle/sdk37` only when the host's compileSdk has the API, and from
 * `src/main/metricStyle/unavailable` otherwise, so apps on compileSdk 36 still build.
 */
@ChecksSdkIntAtLeast(api = METRIC_STYLE_MIN_SDK)
internal fun canUseMetricStyle(): Boolean = METRIC_STYLE_COMPILED && Build.VERSION.SDK_INT >= METRIC_STYLE_MIN_SDK

/**
 * The pre-API-37 rendering: `"<label> <value><unit>"` joined by `", "`. Time-driven
 * values are evaluated against "now" once, at post time — an update refreshes them.
 */
internal fun renderMetricFallbackText(payload: AndroidOngoingNotificationMetricPayload): String =
    payload.metrics.joinToString(", ") { entry ->
        "${entry.label} ${formatMetricValue(entry.value)}"
    }

private fun formatMetricValue(value: AndroidOngoingNotificationMetricValuePayload): String {
    val (body, unit) =
        when (value) {
            is AndroidOngoingNotificationMetricIntPayload -> {
                value.value.toString() to value.unit
            }

            is AndroidOngoingNotificationMetricFloatPayload -> {
                formatMetricFloat(value.value, value.fractionDigits) to value.unit
            }

            is AndroidOngoingNotificationMetricTextPayload -> {
                value.value to value.unit
            }

            is AndroidOngoingNotificationMetricTimePayload -> {
                value.value to null
            }

            is AndroidOngoingNotificationMetricTimerPayload -> {
                formatMetricDuration(value.endsAt - System.currentTimeMillis()) to null
            }

            is AndroidOngoingNotificationMetricStopwatchPayload -> {
                formatMetricDuration(System.currentTimeMillis() - value.startedAt) to null
            }

            is AndroidOngoingNotificationMetricPausedTimerPayload -> {
                formatMetricDuration(value.remainingMillis) to null
            }

            is AndroidOngoingNotificationMetricPausedStopwatchPayload -> {
                formatMetricDuration(value.elapsedMillis) to null
            }
        }

    return body + (unit ?: "")
}

private fun formatMetricFloat(
    value: Double,
    fractionDigits: Int?,
): String =
    if (fractionDigits != null) {
        String.format(Locale.US, "%.${fractionDigits}f", value)
    } else if (value == Math.floor(value) && !value.isInfinite() && Math.abs(value) < 1e15) {
        value.toLong().toString()
    } else {
        value.toString()
    }

private fun formatMetricDuration(millis: Long): String {
    val totalSeconds = (if (millis < 0) 0 else millis) / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60

    return if (hours > 0) {
        String.format(Locale.US, "%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format(Locale.US, "%02d:%02d", minutes, seconds)
    }
}
