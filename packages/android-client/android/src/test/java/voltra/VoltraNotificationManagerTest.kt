package voltra

import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

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
}
