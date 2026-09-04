package voltra.widget.payload

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution

@RunWith(RobolectricTestRunner::class)
class PayloadWidgetUpdaterTest {
    private val resolvesToPayloadWidget =
        PayloadWidgetKindResolver { VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Payload) }

    @Test
    fun persistsThePayloadBeforeTriggeringTheWidgetUpdate() =
        runTest {
            var persistedJson: String? = null
            var persistedDeepLinkUrl: String? = null
            var jsonObservedAtTrigger: String? = null
            val payloadWidgetUpdater =
                PayloadWidgetUpdater(
                    payloadWidgetKindResolver = resolvesToPayloadWidget,
                    payloadWidgetPersistence = { _, jsonString, deepLinkUrl ->
                        persistedJson = jsonString
                        persistedDeepLinkUrl = deepLinkUrl
                    },
                    payloadWidgetUpdateTrigger = {
                        jsonObservedAtTrigger = persistedJson
                    },
                )

            payloadWidgetUpdater.updatePayloadWidget(
                widgetId = "weather-widget",
                jsonString = """{"variants":[]}""",
                deepLinkUrl = "voltra://weather",
            )

            assertEquals("""{"variants":[]}""", persistedJson)
            assertEquals("voltra://weather", persistedDeepLinkUrl)
            assertEquals("""{"variants":[]}""", jsonObservedAtTrigger)
        }

    @Test
    fun rejectsADynamicWidgetBeforePersistingOrTriggeringAnUpdate() =
        runTest {
            var persisted = false
            var triggered = false
            val payloadWidgetUpdater =
                PayloadWidgetUpdater(
                    payloadWidgetKindResolver = {
                        VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Dynamic)
                    },
                    payloadWidgetPersistence = { _, _, _ -> persisted = true },
                    payloadWidgetUpdateTrigger = { triggered = true },
                )

            val updateFailure =
                runCatching {
                    payloadWidgetUpdater.updatePayloadWidget(
                        widgetId = "dynamic-widget",
                        jsonString = """{"variants":[]}""",
                        deepLinkUrl = null,
                    )
                }.exceptionOrNull()

            assertTrue(updateFailure is PayloadWidgetUpdateRejection.KindMismatch)
            assertFalse(persisted)
            assertFalse(triggered)
        }

    @Test
    fun stillPersistsAndTriggersAnUpdateWhenTheWidgetsKindIsUnresolved() =
        runTest {
            var persistedJson: String? = null
            var triggered = false
            val payloadWidgetUpdater =
                PayloadWidgetUpdater(
                    payloadWidgetKindResolver = {
                        VoltraWidgetKindResolution.Unresolved("no receiver registered")
                    },
                    payloadWidgetPersistence = { _, jsonString, _ -> persistedJson = jsonString },
                    payloadWidgetUpdateTrigger = { triggered = true },
                )

            payloadWidgetUpdater.updatePayloadWidget(
                widgetId = "unknown-widget",
                jsonString = """{"variants":[]}""",
                deepLinkUrl = null,
            )

            assertEquals("""{"variants":[]}""", persistedJson)
            assertTrue(triggered)
        }

    @Test
    fun propagatesPersistenceFailuresWithoutTriggeringAnUpdate() =
        runTest {
            val persistenceFailure = IllegalStateException("payload storage failed")
            var triggered = false
            val payloadWidgetUpdater =
                PayloadWidgetUpdater(
                    payloadWidgetKindResolver = resolvesToPayloadWidget,
                    payloadWidgetPersistence = { _, _, _ -> throw persistenceFailure },
                    payloadWidgetUpdateTrigger = { triggered = true },
                )

            val updateFailure =
                runCatching {
                    payloadWidgetUpdater.updatePayloadWidget(
                        widgetId = "storage-failure-widget",
                        jsonString = "{}",
                        deepLinkUrl = null,
                    )
                }.exceptionOrNull()

            assertSame(persistenceFailure, updateFailure)
            assertFalse(triggered)
        }
}
