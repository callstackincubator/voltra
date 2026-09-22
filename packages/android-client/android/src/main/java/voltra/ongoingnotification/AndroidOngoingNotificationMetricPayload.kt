package voltra.ongoingnotification

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonClassDiscriminator

/**
 * A single metric reading. The JSON discriminator is `type` (the payload-level
 * `kind` discriminator belongs to [AndroidOngoingNotificationPayload]); the JS
 * renderer's number/string shorthands are normalized away before serialization,
 * so the Kotlin side only ever sees the explicit object forms.
 */
@OptIn(ExperimentalSerializationApi::class)
@Serializable
@JsonClassDiscriminator("type")
sealed class AndroidOngoingNotificationMetricValuePayload {
    /** Validation shared by all metric values; per-shape rules live in the payload that carries them. */
    fun validateValue(propName: String) {
        when (this) {
            is AndroidOngoingNotificationMetricIntPayload -> {
                Unit
            }

            is AndroidOngoingNotificationMetricFloatPayload -> {
                requireMetric(
                    min == null || min >= 0.0,
                    "$propName.min must be greater than or equal to 0.",
                )
                requireMetric(
                    max == null || max >= 0.0,
                    "$propName.max must be greater than or equal to 0.",
                )
                requireMetric(
                    min == null || max == null || min <= max,
                    "$propName.min must not exceed $propName.max.",
                )
                requireMetric(
                    fractionDigits == null || fractionDigits >= 0,
                    "$propName.fractionDigits must be greater than or equal to 0.",
                )
            }

            is AndroidOngoingNotificationMetricTextPayload -> {
                requireMetric(value.isNotEmpty(), "$propName.value must be a non-empty string.")
            }

            is AndroidOngoingNotificationMetricTimePayload -> {
                requireMetric(
                    METRIC_TIME_PATTERN.matches(value),
                    "$propName.value must be a time in \"HH:mm\" or \"HH:mm:ss\" form.",
                )
            }

            is AndroidOngoingNotificationMetricTimerPayload -> {
                validateTimeFormat(propName)
            }

            is AndroidOngoingNotificationMetricStopwatchPayload -> {
                validateTimeFormat(propName)
            }

            is AndroidOngoingNotificationMetricPausedTimerPayload -> {
                requireMetric(
                    remainingMillis >= 0,
                    "$propName.remainingMillis must be greater than or equal to 0.",
                )
            }

            is AndroidOngoingNotificationMetricPausedStopwatchPayload -> {
                requireMetric(
                    elapsedMillis >= 0,
                    "$propName.elapsedMillis must be greater than or equal to 0.",
                )
            }
        }
    }

    private fun validateTimeFormat(propName: String) {
        val format =
            when (this) {
                is AndroidOngoingNotificationMetricTimerPayload -> this.format
                is AndroidOngoingNotificationMetricStopwatchPayload -> this.format
                else -> null
            }

        requireMetric(
            format == null || format == "adaptive" || format == "chronometer",
            "$propName.format must be \"adaptive\" or \"chronometer\".",
        )
    }

    companion object {
        internal val METRIC_TIME_PATTERN = Regex("""^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$""")

        private fun requireMetric(
            condition: Boolean,
            message: String,
        ) {
            if (!condition) {
                throw VoltraNotificationException(VoltraNotificationException.INVALID_PAYLOAD, message)
            }
        }
    }
}

@Serializable
@SerialName("int")
data class AndroidOngoingNotificationMetricIntPayload(
    val value: Int,
    val unit: String? = null,
) : AndroidOngoingNotificationMetricValuePayload()

@Serializable
@SerialName("float")
data class AndroidOngoingNotificationMetricFloatPayload(
    val value: Double,
    val unit: String? = null,
    val min: Double? = null,
    val max: Double? = null,
    val fractionDigits: Int? = null,
) : AndroidOngoingNotificationMetricValuePayload()

@Serializable
@SerialName("text")
data class AndroidOngoingNotificationMetricTextPayload(
    val value: String,
    val unit: String? = null,
) : AndroidOngoingNotificationMetricValuePayload()

@Serializable
@SerialName("time")
data class AndroidOngoingNotificationMetricTimePayload(
    val value: String,
) : AndroidOngoingNotificationMetricValuePayload()

@Serializable
@SerialName("timer")
data class AndroidOngoingNotificationMetricTimerPayload(
    val endsAt: Long,
    val format: String? = null,
) : AndroidOngoingNotificationMetricValuePayload()

@Serializable
@SerialName("stopwatch")
data class AndroidOngoingNotificationMetricStopwatchPayload(
    val startedAt: Long,
    val format: String? = null,
) : AndroidOngoingNotificationMetricValuePayload()

@Serializable
@SerialName("pausedTimer")
data class AndroidOngoingNotificationMetricPausedTimerPayload(
    val remainingMillis: Long,
) : AndroidOngoingNotificationMetricValuePayload()

@Serializable
@SerialName("pausedStopwatch")
data class AndroidOngoingNotificationMetricPausedStopwatchPayload(
    val elapsedMillis: Long,
) : AndroidOngoingNotificationMetricValuePayload()

@Serializable
data class AndroidOngoingNotificationMetricEntryPayload(
    val label: String,
    val value: AndroidOngoingNotificationMetricValuePayload,
)
