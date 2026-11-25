package voltra.dynamicwidget

import android.app.AlarmManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetTimelineAlarmTest {
    private val application = RuntimeEnvironment.getApplication()
    private val alarmManager get() = application.getSystemService(AlarmManager::class.java)

    @Test
    fun schedulesTheEarliestFutureDateAndIgnoresPastOnes() {
        val now = 1_700_000_000_000L
        val earlierFuture = now + 60_000L
        val laterFuture = now + 300_000L

        DynamicWidgetTimelineAlarm.schedule(
            context = application,
            widgetId = "countdown",
            appWidgetId = 5,
            propsJson = "{}",
            now = now,
            timelineDates = { _, _ -> listOf(now - 5_000L, now, laterFuture, earlierFuture) },
        )

        val scheduled = Shadows.shadowOf(alarmManager).scheduledAlarms
        assertEquals(1, scheduled.size)
        assertEquals(AlarmManager.RTC, scheduled[0].type)
        assertEquals(earlierFuture, scheduled[0].triggerAtTime)
        assertEquals(DynamicWidgetTimelineAlarm.WINDOW_MS, scheduled[0].windowLengthMs)
    }

    @Test
    fun cancelsThePendingAlarmWhenNoFutureDatesRemain() {
        val now = 1_700_000_000_000L

        DynamicWidgetTimelineAlarm.schedule(
            context = application,
            widgetId = "countdown",
            appWidgetId = 5,
            propsJson = "{}",
            now = now,
            timelineDates = { _, _ -> listOf(now + 60_000L) },
        )
        assertNotNull(Shadows.shadowOf(alarmManager).nextScheduledAlarm)

        DynamicWidgetTimelineAlarm.schedule(
            context = application,
            widgetId = "countdown",
            appWidgetId = 5,
            propsJson = "{}",
            now = now,
            timelineDates = { _, _ -> listOf(now - 1_000L) },
        )
        assertNull(Shadows.shadowOf(alarmManager).nextScheduledAlarm)
    }

    @Test
    fun keepsOneAlarmPerPlacementAndCancelsOnlyTheRemovedOne() {
        val now = 1_700_000_000_000L
        val firstAt = now + 60_000L
        val secondAt = now + 120_000L

        DynamicWidgetTimelineAlarm.schedule(
            context = application,
            widgetId = "countdown",
            appWidgetId = 1,
            propsJson = "{}",
            now = now,
            timelineDates = { _, _ -> listOf(firstAt) },
        )
        DynamicWidgetTimelineAlarm.schedule(
            context = application,
            widgetId = "countdown",
            appWidgetId = 2,
            propsJson = "{}",
            now = now,
            timelineDates = { _, _ -> listOf(secondAt) },
        )
        assertEquals(2, Shadows.shadowOf(alarmManager).scheduledAlarms.size)

        DynamicWidgetTimelineAlarm.cancel(application, "countdown", 1)

        val remaining = Shadows.shadowOf(alarmManager).scheduledAlarms
        assertEquals(1, remaining.size)
        assertEquals(secondAt, remaining[0].triggerAtTime)
    }
}
