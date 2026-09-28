package voltra.ongoingnotification

import android.app.Notification
import androidx.annotation.RequiresApi
import java.time.Duration
import java.time.Instant
import java.time.LocalTime
import java.util.Locale

/** `Notification.MetricStyle` is API 37; metrics fall back to a plain text line below it. */
internal const val METRIC_STYLE_MIN_SDK = 37

/**
 * Builds the platform `MetricStyle` for a metric payload. Only reached with
 * `SDK_INT >= METRIC_STYLE_MIN_SDK`; the `java.time` conversions would not load below API 26
 * anyway, and the guarded call sites keep them from ever being verified on old devices.
 */
@RequiresApi(METRIC_STYLE_MIN_SDK)
internal fun buildMetricStyle(payload: AndroidOngoingNotificationMetricPayload): Notification.MetricStyle {
    val semanticStyle = metricSemanticStyle(payload.semanticStyle)

    val style =
        Notification
            .MetricStyle()

    payload.metrics.forEach { entry ->
        val metric =
            if (semanticStyle == Notification.SEMANTIC_STYLE_UNSPECIFIED) {
                Notification.Metric(entry.value.toPlatformMetricValue(), entry.label)
            } else {
                Notification.Metric(entry.value.toPlatformMetricValue(), entry.label, semanticStyle)
            }
        style.addMetric(metric)
    }

    payload.criticalMetric?.let { style.setCriticalMetric(it) }

    return style
}

private fun metricSemanticStyle(semanticStyle: String?): Int =
    when (semanticStyle) {
        "info" -> Notification.SEMANTIC_STYLE_INFO
        "safe" -> Notification.SEMANTIC_STYLE_SAFE
        "caution" -> Notification.SEMANTIC_STYLE_CAUTION
        "danger" -> Notification.SEMANTIC_STYLE_DANGER
        else -> Notification.SEMANTIC_STYLE_UNSPECIFIED
    }

@RequiresApi(METRIC_STYLE_MIN_SDK)
private fun metricTimeFormat(format: String?): Int =
    if (format == "chronometer") {
        Notification.Metric.TimeDifference.FORMAT_CHRONOMETER
    } else {
        Notification.Metric.TimeDifference.FORMAT_ADAPTIVE
    }

@RequiresApi(METRIC_STYLE_MIN_SDK)
private fun AndroidOngoingNotificationMetricValuePayload.toPlatformMetricValue(): Notification.Metric.MetricValue =
    when (this) {
        is AndroidOngoingNotificationMetricIntPayload -> {
            if (unit != null) {
                Notification.Metric.FixedInt(value, unit)
            } else {
                Notification.Metric.FixedInt(value)
            }
        }

        is AndroidOngoingNotificationMetricFloatPayload -> {
            if (fractionDigits != null) {
                Notification.Metric.FixedFloat(value.toFloat(), unit ?: "", fractionDigits, fractionDigits)
            } else if (unit != null) {
                Notification.Metric.FixedFloat(value.toFloat(), unit)
            } else {
                Notification.Metric.FixedFloat(value.toFloat())
            }
        }

        is AndroidOngoingNotificationMetricTextPayload -> {
            if (unit != null) {
                Notification.Metric.FixedText(value, unit)
            } else {
                Notification.Metric.FixedText(value)
            }
        }

        is AndroidOngoingNotificationMetricTimePayload -> {
            Notification.Metric.FixedTime(LocalTime.parse(value))
        }

        is AndroidOngoingNotificationMetricTimerPayload -> {
            Notification.Metric.TimeDifference.forTimer(Instant.ofEpochMilli(endsAt), metricTimeFormat(format))
        }

        is AndroidOngoingNotificationMetricStopwatchPayload -> {
            Notification.Metric.TimeDifference.forStopwatch(Instant.ofEpochMilli(startedAt), metricTimeFormat(format))
        }

        is AndroidOngoingNotificationMetricPausedTimerPayload -> {
            Notification.Metric.TimeDifference.forPausedTimer(
                Duration.ofMillis(remainingMillis),
                Notification.Metric.TimeDifference.FORMAT_ADAPTIVE,
            )
        }

        is AndroidOngoingNotificationMetricPausedStopwatchPayload -> {
            Notification.Metric.TimeDifference.forPausedStopwatch(
                Duration.ofMillis(elapsedMillis),
                Notification.Metric.TimeDifference.FORMAT_ADAPTIVE,
            )
        }
    }

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
