package voltra.ongoingnotification

import android.app.Notification
import androidx.annotation.RequiresApi

// Compiled when the host app's compileSdk is below 37, where `Notification.MetricStyle` does
// not exist; see build.gradle. Metric payloads then post with the text fallback.
internal const val METRIC_STYLE_COMPILED = false

@RequiresApi(METRIC_STYLE_MIN_SDK)
internal fun buildMetricStyle(payload: AndroidOngoingNotificationMetricPayload): Notification.Style =
    throw UnsupportedOperationException("Voltra was compiled without Notification.MetricStyle")
