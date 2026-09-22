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
