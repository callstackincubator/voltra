package voltra

import android.provider.Settings
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

private const val FAKE_PROMOTION_SETTINGS_ACTIVITY = "voltra.test.FakePromotionSettingsActivity"

/**
 * Pre-Live-Update behavior contract: everything Voltra did on Android 15 and below must
 * keep working — countdown chip extras included (`setChronometerCountDown` is API 24),
 * while the promotion bit, promotion info, `ProgressStyle` and `MetricStyle` must stay
 * absent. The default SDK comes from `robolectric.properties` (35).
 */
@RunWith(RobolectricTestRunner::class)
class VoltraNotificationManagerTest : VoltraNotificationManagerTestBase(false)

/** Android 16: promotion requests, eligibility reasons and the platform `ProgressStyle`. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36], shadows = [ShadowPromotedNotificationManager::class])
class VoltraNotificationManagerApi36Test : VoltraNotificationManagerTestBase(true) {
    override fun registerPromotionSettingsActivity() {
        registerActivityForAction(Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS, FAKE_PROMOTION_SETTINGS_ACTIVITY)
    }
}

/** Android 17 (`compileSdk 37`): the platform `MetricStyle` and the platform promotion accessor. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [37], shadows = [ShadowPromotedNotificationManager::class])
class VoltraNotificationManagerApi37Test : VoltraNotificationManagerTestBase(true, metricStyleSupported = true) {
    override fun registerPromotionSettingsActivity() {
        registerActivityForAction(Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS, FAKE_PROMOTION_SETTINGS_ACTIVITY)
    }
}
