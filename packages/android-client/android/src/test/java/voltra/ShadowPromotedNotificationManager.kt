package voltra

import android.app.NotificationManager
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements
import org.robolectric.shadows.ShadowNotificationManager

/**
 * Robolectric does not yet shadow `canPostPromotedNotifications()`; the real framework
 * method would hit a null binder. The constant false models "the user has not enabled
 * Live Updates for this app", which is precisely the state the promotion request must be
 * written in (the whole point of the request-before-enablement contract).
 */
@Implements(NotificationManager::class)
class ShadowPromotedNotificationManager : ShadowNotificationManager() {
    @Implementation
    protected fun canPostPromotedNotifications(): Boolean = false
}
