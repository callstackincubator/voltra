package voltra.dynamicwidget

import android.app.AlarmManager
import org.junit.After
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
    private val now = 1_700_000_000_000L

    @After
    fun clearScheduled() = DynamicWidgetTimelineAlarm.clearForTesting()

    private fun schedule(
        appWidgetId: Int = 5,
        propsJson: String = "{}",
        now: Long = this.now,
        timelineDates: (String, String) -> List<Long>?,
    ) = DynamicWidgetTimelineAlarm.schedule(application, "countdown", appWidgetId, propsJson, now, timelineDates)

    @Test
    fun schedulesTheEarliestFutureDateAndIgnoresPastOnes() {
        val earlierFuture = now + 60_000L
        val laterFuture = now + 300_000L

        schedule { _, _ -> listOf(now - 5_000L, now, laterFuture, earlierFuture) }

        val scheduled = Shadows.shadowOf(alarmManager).scheduledAlarms
        assertEquals(1, scheduled.size)
        assertEquals(AlarmManager.RTC, scheduled[0].type)
        assertEquals(earlierFuture, scheduled[0].triggerAtTime)
        assertEquals(10 * 60_000L, scheduled[0].windowLengthMs)
    }

    @Test
    fun cancelsThePendingAlarmWhenNoFutureDatesRemain() {
        schedule(propsJson = """{"v":1}""") { _, _ -> listOf(now + 60_000L) }
        assertNotNull(Shadows.shadowOf(alarmManager).nextScheduledAlarm)

        schedule(propsJson = """{"v":2}""") { _, _ -> listOf(now - 1_000L) }
        assertNull(Shadows.shadowOf(alarmManager).nextScheduledAlarm)
    }

    @Test
    fun asksTimelineOncePerPropsUntilTheScheduledDatePasses() {
        var calls = 0
        val dates: (String, String) -> List<Long> = { _, _ ->
            calls++
            listOf(now + 60_000L, now + 120_000L)
        }

        schedule(timelineDates = dates)
        schedule(timelineDates = dates)
        assertEquals(1, calls)

        schedule(now = now + 60_000L, timelineDates = dates)
        assertEquals(2, calls)
        assertEquals(now + 120_000L, Shadows.shadowOf(alarmManager).nextScheduledAlarm!!.triggerAtTime)
    }

    @Test
    fun aWidgetWithoutATimelineExportSchedulesNothing() {
        var calls = 0
        schedule { _, _ ->
            calls++
            null
        }
        schedule { _, _ ->
            calls++
            null
        }

        assertEquals(1, calls)
        assertNull(Shadows.shadowOf(alarmManager).nextScheduledAlarm)
    }

    @Test
    fun aThrowingTimelineCancelsThePendingAlarm() {
        schedule(propsJson = """{"v":1}""") { _, _ -> listOf(now + 60_000L) }

        schedule(propsJson = """{"v":2}""") { _, _ -> throw VoltraJSException("no dates", null) }

        assertNull(Shadows.shadowOf(alarmManager).nextScheduledAlarm)
    }

    @Test
    fun keepsOneAlarmPerPlacementAndCancelsOnlyTheRemovedOne() {
        val firstAt = now + 60_000L
        val secondAt = now + 120_000L

        schedule(appWidgetId = 1) { _, _ -> listOf(firstAt) }
        schedule(appWidgetId = 2) { _, _ -> listOf(secondAt) }
        assertEquals(2, Shadows.shadowOf(alarmManager).scheduledAlarms.size)

        DynamicWidgetTimelineAlarm.cancel(application, "countdown", 1)

        val remaining = Shadows.shadowOf(alarmManager).scheduledAlarms
        assertEquals(1, remaining.size)
        assertEquals(secondAt, remaining[0].triggerAtTime)
    }
}
