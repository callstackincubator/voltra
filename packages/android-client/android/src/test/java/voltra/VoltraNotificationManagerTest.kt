package voltra

import android.app.Notification
import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import org.junit.Assert.assertTrue
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/**
 * Floor of Voltra's supported range: channels, the channel-not-found rejection, the
 * platform progress style and promotion do not exist, so every post goes through the
 * pre-API-26 single-argument `Builder(context)` and every settings helper lands on the
 * app-details page.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [24])
class VoltraNotificationManagerApi24Test : VoltraNotificationManagerTestBase(false)

/**
 * First API level with notification channels: channel lookups, the channel-not-found
 * rejection and the channel-list settings page become live, while promotion and the
 * platform progress style are still out of the picture.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [26])
class VoltraNotificationManagerApi26Test : VoltraNotificationManagerTestBase(false)

/**
 * Pre-Live-Update behavior contract: everything Voltra did on Android 15 and below must
 * keep working — countdown chip extras included (`setChronometerCountDown` is API 24),
 * while the promotion bit, promotion info and `ProgressStyle` must stay absent.
 * The default SDK comes from `robolectric.properties` (35).
 */
@RunWith(RobolectricTestRunner::class)
class VoltraNotificationManagerTest : VoltraNotificationManagerTestBase(false)

/** Android 16: promotion requests, eligibility reasons and the platform `ProgressStyle`. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36], shadows = [ShadowPromotedNotificationManager::class])
class VoltraNotificationManagerApi36Test : VoltraNotificationManagerTestBase(true) {
    override fun registerPromotionSettingsActivity() {
        val component = ComponentName(context.packageName, "voltra.test.FakePromotionSettingsActivity")
        val filter =
            IntentFilter(Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS).apply {
                // resolveActivity matches with CATEGORY_DEFAULT added to the intent.
                addCategory(Intent.CATEGORY_DEFAULT)
            }
        shadowOf(context.packageManager).addActivityIfNotPresent(component)
        shadowOf(context.packageManager).addIntentFilterForActivity(component, filter)
    }

    /**
     * Verification for Android 16 QPR (SDK 36.1) devices, where `Builder` gained
     * `setRequestPromotedOngoing` writing the same extras key on the framework side —
     * and `build()` gives framework extras precedence over the user extras Voltra
     * writes. If that Builder ever defaults the key, the promotion request would be
     * silently dropped on exactly the newest devices. Robolectric ships no 36.1 image,
     * so run this reflection-based assertion on a 36.1 emulator/system image, then drop
     * the `@Ignore`.
     */
    @Ignore(
        "Manual check on an SDK 36.1 image (Robolectric caps at 36.0): post with requestPromotedOngoing and confirm the platform reports the request",
    )
    @Test
    fun platformStillReportsThePromotionRequestOnThe361Builder() {
        startChannel()
        start(bigTextPayload(), notificationId = "promoted-361", requestPromotedOngoing = true)

        val reported =
            Notification::class.java
                .getMethod("isRequestPromotedOngoing")
                .invoke(lastPosted()) as Boolean
        assertTrue(reported)
    }
}
