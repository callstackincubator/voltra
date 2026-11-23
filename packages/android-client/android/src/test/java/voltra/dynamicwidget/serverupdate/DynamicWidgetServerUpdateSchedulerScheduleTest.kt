package voltra.dynamicwidget.serverupdate

import android.content.Context
import android.net.ConnectivityManager
import androidx.work.Configuration
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.impl.WorkManagerImpl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerSettingsLayer
import voltra.widget.server.WidgetServerSettingsResolver
import voltra.widget.server.WidgetServerUpdateSettings
import java.util.concurrent.Executor
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class DynamicWidgetServerUpdateSchedulerScheduleTest {
    private val context: Context = RuntimeEnvironment.getApplication()
    private val scheduler = DynamicWidgetServerUpdateScheduler
    private val scope = WidgetScope.of("scheduleProbe")
    private val periodicName = scheduler.workName(scope)
    private val immediateName = "${periodicName}_once"
    private lateinit var workManager: WorkManager
    private var previousResolver: WidgetServerSettingsResolver? = null
    private var enabled = true

    @Before
    fun setUp() {
        val connectivity = requireNotNull(context.getSystemService(ConnectivityManager::class.java))
        shadowOf(connectivity).setActiveNetworkInfo(null)
        val synchronous = Executor { command -> command.run() }
        workManager =
            runBlocking(Dispatchers.IO) {
                WorkManager.initialize(
                    context,
                    Configuration
                        .Builder()
                        .setExecutor(synchronous)
                        .setTaskExecutor(synchronous)
                        .build(),
                )
                WorkManager.getInstance(context)
            }

        // Supply settings without creating an Android Keystore or generated app assets.
        val settingsLayer =
            object : WidgetServerSettingsLayer {
                override val name = "test"

                override suspend fun settings(scope: WidgetScope) =
                    WidgetServerUpdateSettings(url = "https://example.test/widget", enabled = enabled)

                override suspend fun isServerDriven(scope: WidgetScope) = true
            }
        previousResolver = ReflectionHelpers.getStaticField(VoltraWidgetServer::class.java, "resolverCache")
        ReflectionHelpers.setStaticField(
            VoltraWidgetServer::class.java,
            "resolverCache",
            WidgetServerSettingsResolver(listOf(settingsLayer)) { 0L },
        )
    }

    @After
    fun tearDown() {
        ReflectionHelpers.setStaticField(VoltraWidgetServer::class.java, "resolverCache", previousResolver)
        // WorkManager keeps its instance in static fields for the whole test JVM, so the next test's
        // WorkManager.initialize would throw. Clear them so every test starts from an empty database.
        ReflectionHelpers.setStaticField(WorkManagerImpl::class.java, "sDelegatedInstance", null)
        ReflectionHelpers.setStaticField(WorkManagerImpl::class.java, "sDefaultInstance", null)
    }

    @Test
    fun `no periodic work means an immediate fetch, existing periodic work means none`() =
        runBlocking(Dispatchers.IO) {
            assertTrue(work(periodicName).isEmpty())
            assertTrue(work(immediateName).isEmpty())

            scheduler.schedule(context, scope)

            val periodic = work(periodicName).single()
            assertEquals(WorkInfo.State.ENQUEUED, periodic.state)
            val immediate = work(immediateName).single()
            assertEquals(WorkInfo.State.ENQUEUED, immediate.state)
            assertEquals(0L, immediate.initialDelayMillis)

            // Remove the active one-time job while leaving the periodic job in place.
            workManager.cancelUniqueWork(immediateName).result.get(5, TimeUnit.SECONDS)
            val oneTimeHistory = work(immediateName).map { it.id }.toSet()
            scheduler.schedule(context, scope)

            assertEquals(periodic.id, work(periodicName).single().id)
            assertEquals(oneTimeHistory, work(immediateName).map { it.id }.toSet())
            assertTrue(work(immediateName).all { it.state.isFinished })
        }

    @Test
    fun `re-enabling enqueues an immediate fetch after periodic work was cancelled`() =
        runBlocking(Dispatchers.IO) {
            scheduler.schedule(context, scope)
            val oldPeriodic = work(periodicName).single()
            val oldImmediate = work(immediateName).single()

            enabled = false
            scheduler.schedule(context, scope)
            assertEquals(WorkInfo.State.CANCELLED, work(periodicName).single().state)
            assertTrue(work(immediateName).all { it.state.isFinished })

            enabled = true
            scheduler.schedule(context, scope)

            val periodic = work(periodicName).single { !it.state.isFinished }
            val immediate = work(immediateName).single { !it.state.isFinished }
            assertTrue(periodic.id != oldPeriodic.id)
            assertTrue(immediate.id != oldImmediate.id)
            assertEquals(0L, immediate.initialDelayMillis)
        }

    private fun work(name: String): List<WorkInfo> =
        workManager.getWorkInfosForUniqueWork(name).get(5, TimeUnit.SECONDS)
}
