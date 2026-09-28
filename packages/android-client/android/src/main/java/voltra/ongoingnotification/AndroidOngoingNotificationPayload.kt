package voltra.ongoingnotification

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AndroidOngoingNotificationImageSource(
    val assetName: String? = null,
    val base64: String? = null,
)

@Serializable
data class AndroidOngoingNotificationProgressSegmentPayload(
    val length: Int,
    val color: String? = null,
)

@Serializable
data class AndroidOngoingNotificationProgressPointPayload(
    val position: Int,
    val color: String? = null,
)

@Serializable
data class AndroidOngoingNotificationActionPayload(
    val title: String,
    val deepLinkUrl: String,
    val icon: AndroidOngoingNotificationImageSource? = null,
)

@Serializable
sealed class AndroidOngoingNotificationPayload {
    abstract val v: Int
    abstract val title: String?
    abstract val subText: String?
    abstract val shortCriticalText: String?
    abstract val chronometer: Boolean?
    abstract val chronometerCountDown: Boolean?
    abstract val whenEpochMillis: Long?
    abstract val largeIcon: AndroidOngoingNotificationImageSource?
    abstract val actions: List<AndroidOngoingNotificationActionPayload>?

    /** Whether the platform needs `contentTitle` to promote this style. */
    open val promotionRequiresTitle: Boolean
        get() = true

    /**
     * Cross-kind payload rules; kind subclasses extend this. Remote payloads bypass the
     * JS renderer, so the Kotlin side is the authority and rejects with
     * [VoltraNotificationException] instead of throwing a bare exception.
     */
    open fun validate() {
        if (chronometerCountDown == true && whenEpochMillis == null) {
            throw VoltraNotificationException(
                VoltraNotificationException.INVALID_PAYLOAD,
                "chronometerCountDown requires the \"when\" prop: a countdown needs a target time.",
            )
        }
    }
}

@Serializable
@SerialName("progress")
data class AndroidOngoingNotificationProgressPayload(
    override val v: Int,
    override val title: String? = null,
    override val subText: String? = null,
    val text: String? = null,
    val value: Int,
    val max: Int,
    val indeterminate: Boolean? = null,
    override val shortCriticalText: String? = null,
    @SerialName("when")
    override val whenEpochMillis: Long? = null,
    override val chronometer: Boolean? = null,
    override val chronometerCountDown: Boolean? = null,
    override val largeIcon: AndroidOngoingNotificationImageSource? = null,
    val progressTrackerIcon: AndroidOngoingNotificationImageSource? = null,
    val progressStartIcon: AndroidOngoingNotificationImageSource? = null,
    val progressEndIcon: AndroidOngoingNotificationImageSource? = null,
    val segments: List<AndroidOngoingNotificationProgressSegmentPayload>? = null,
    val points: List<AndroidOngoingNotificationProgressPointPayload>? = null,
    override val actions: List<AndroidOngoingNotificationActionPayload>? = null,
) : AndroidOngoingNotificationPayload()

@Serializable
@SerialName("bigText")
data class AndroidOngoingNotificationBigTextPayload(
    override val v: Int,
    override val title: String? = null,
    override val subText: String? = null,
    val text: String,
    val bigText: String? = null,
    override val shortCriticalText: String? = null,
    @SerialName("when")
    override val whenEpochMillis: Long? = null,
    override val chronometer: Boolean? = null,
    override val chronometerCountDown: Boolean? = null,
    override val largeIcon: AndroidOngoingNotificationImageSource? = null,
    override val actions: List<AndroidOngoingNotificationActionPayload>? = null,
) : AndroidOngoingNotificationPayload()

@Serializable
@SerialName("metric")
data class AndroidOngoingNotificationMetricPayload(
    override val v: Int,
    override val title: String? = null,
    override val subText: String? = null,
    override val shortCriticalText: String? = null,
    @SerialName("when")
    override val whenEpochMillis: Long? = null,
    override val chronometer: Boolean? = null,
    override val chronometerCountDown: Boolean? = null,
    override val largeIcon: AndroidOngoingNotificationImageSource? = null,
    val metrics: List<AndroidOngoingNotificationMetricEntryPayload> = emptyList(),
    val criticalMetric: Int? = null,
    val semanticStyle: String? = null,
    override val actions: List<AndroidOngoingNotificationActionPayload>? = null,
) : AndroidOngoingNotificationPayload() {
    // A metrics layout carries its own readings; the platform does not need a title to
    // promote it, unlike the text-driven styles.
    override val promotionRequiresTitle: Boolean
        get() = false

    override fun validate() {
        super.validate()

        if (metrics.isEmpty() || metrics.size > METRIC_MAX_COUNT) {
            throw VoltraNotificationException(
                VoltraNotificationException.INVALID_PAYLOAD,
                "Ongoing notification prop \"metrics\" must contain between 1 and $METRIC_MAX_COUNT metrics.",
            )
        }

        metrics.forEachIndexed { index, entry ->
            if (entry.label.isEmpty() || entry.label.length > METRIC_MAX_LABEL_LENGTH) {
                throw VoltraNotificationException(
                    VoltraNotificationException.INVALID_PAYLOAD,
                    "Ongoing notification prop \"metrics[$index].label\" must be between 1 and " +
                        "$METRIC_MAX_LABEL_LENGTH characters long.",
                )
            }

            entry.value.validateValue("metrics[$index]")
        }

        if (criticalMetric != null && (criticalMetric < 0 || criticalMetric >= metrics.size)) {
            throw VoltraNotificationException(
                VoltraNotificationException.INVALID_PAYLOAD,
                "Ongoing notification prop \"criticalMetric\" must be an index between 0 and ${metrics.size - 1}.",
            )
        }

        if (semanticStyle != null && semanticStyle !in METRIC_SEMANTIC_STYLES) {
            throw VoltraNotificationException(
                VoltraNotificationException.INVALID_PAYLOAD,
                "Ongoing notification prop \"semanticStyle\" must be one of " +
                    METRIC_SEMANTIC_STYLES.joinToString(", ") { "\"$it\"" } + ".",
            )
        }
    }

    companion object {
        const val METRIC_MAX_COUNT = 3
        const val METRIC_MAX_LABEL_LENGTH = 10
        val METRIC_SEMANTIC_STYLES = listOf("unspecified", "info", "safe", "caution", "danger")
    }
}

@Serializable
data class AndroidOngoingNotificationRecord(
    val notificationId: String,
    val systemNotificationId: Int,
    val channelId: String,
    val smallIcon: String? = null,
    val deepLinkUrl: String? = null,
    val requestPromotedOngoing: Boolean = false,
    val fallbackBehavior: String = "standard",
    val active: Boolean = true,
    val dismissed: Boolean = false,
)
