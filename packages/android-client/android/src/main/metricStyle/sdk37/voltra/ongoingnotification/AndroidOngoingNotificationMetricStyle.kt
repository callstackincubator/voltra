package voltra.ongoingnotification

import android.app.Notification
import androidx.annotation.RequiresApi
import java.time.Duration
import java.time.Instant
import java.time.LocalTime

// Compiled only when the host app's compileSdk is 37 or higher; see build.gradle.
internal const val METRIC_STYLE_COMPILED = true

/**
 * Builds the platform `MetricStyle` for a metric payload. Only reached when
 * [canUseMetricStyle] holds; the `java.time` conversions would not load below API 26
 * anyway, and the guarded call sites keep them from ever being verified on old devices.
 */
@RequiresApi(METRIC_STYLE_MIN_SDK)
internal fun buildMetricStyle(payload: AndroidOngoingNotificationMetricPayload): Notification.Style {
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
