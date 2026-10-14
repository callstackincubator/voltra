package voltra.ongoingnotification

/**
 * One option key exactly as it arrived from JavaScript.
 *
 * Presentation options live as long as the notification, so an update has to tell three cases
 * apart: the key was not sent (keep what is stored), the key was sent as `null` (go back to the
 * platform default), or the key was sent with a value (replace what is stored). A nullable Kotlin
 * field can only carry two of the three, which is why the bridge reads into this type instead.
 */
sealed class AndroidOngoingNotificationOption<out T> {
    /** Key absent from the options object: the stored value survives this update. */
    object Unset : AndroidOngoingNotificationOption<Nothing>()

    /** Key present with `null`: clear the stored value and fall back to the platform default. */
    object Cleared : AndroidOngoingNotificationOption<Nothing>()

    /** Key present with a value: replace the stored value. */
    data class Value<T>(
        val value: T,
    ) : AndroidOngoingNotificationOption<T>()
}

/** The stored value [current] after this option is applied to it. */
fun <T> AndroidOngoingNotificationOption<T>.mergedWith(current: T?): T? =
    when (this) {
        AndroidOngoingNotificationOption.Unset -> current
        AndroidOngoingNotificationOption.Cleared -> null
        is AndroidOngoingNotificationOption.Value -> value
    }
