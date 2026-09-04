package voltra.widget

import android.content.ComponentName
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf

/**
 * [VoltraWidgetKindResolver] must work in a fresh process before any widget has been placed, so
 * these tests resolve real (never-instantiated) generated-style receiver classes defined in
 * [com.example.app.widget.VoltraWidgetKindResolverTestReceivers], rather than going through
 * [VoltraWidgetReceiver]'s registry. Fixtures live under a package different from the Robolectric
 * application's own package and are registered through [shadowOf]'s `ShadowPackageManager`,
 * exactly as [VoltraWidgetReceivers] would discover a real generated receiver via
 * `PackageManager` metadata.
 */
@RunWith(RobolectricTestRunner::class)
class VoltraWidgetKindResolverTest {
    private val application = RuntimeEnvironment.getApplication()
    private val fixturePackage = "com.example.app"

    @Before
    fun resetReceiverNameCache() {
        VoltraWidgetReceivers.clearCache()
    }

    private fun registerFixtureReceiver(simpleClassName: String) {
        shadowOf(application.packageManager).addReceiverIfNotPresent(
            ComponentName(application.packageName, "$fixturePackage.widget.$simpleClassName"),
        )
    }

    @Test
    fun resolvesAPayloadDrivenWidgetFromItsGeneratedReceiverClass() {
        registerFixtureReceiver("VoltraWidget_resolverPayloadTestReceiver")

        val resolution = VoltraWidgetKindResolver.resolve(application, "resolverPayloadTest")

        assertEquals(VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Payload), resolution)
    }

    @Test
    fun resolvesADynamicWidgetFromItsGeneratedReceiverClass() {
        registerFixtureReceiver("VoltraWidget_resolverDynamicTestReceiver")

        val resolution = VoltraWidgetKindResolver.resolve(application, "resolverDynamicTest")

        assertEquals(VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Dynamic), resolution)
    }

    @Test
    fun returnsUnresolvedForAnUnknownWidgetIdInAFreshProcess() {
        val resolution = VoltraWidgetKindResolver.resolve(application, "no-such-widget")

        assertTrue(resolution is VoltraWidgetKindResolution.Unresolved)
    }

    @Test
    fun returnsUnresolvedRatherThanEitherKindWhenTheReceiverClassIsNotAVoltraWidgetReceiver() {
        registerFixtureReceiver("VoltraWidget_resolverNotAReceiverTestReceiver")

        val resolution = VoltraWidgetKindResolver.resolve(application, "resolverNotAReceiverTest")

        assertTrue(resolution is VoltraWidgetKindResolution.Unresolved)
    }

    @Test
    fun resolvingDoesNotPopulateTheGlanceWidgetRegistry() {
        registerFixtureReceiver("VoltraWidget_resolverPayloadTestReceiver")

        VoltraWidgetKindResolver.resolve(application, "resolverPayloadTest")

        assertFalse(VoltraWidgetReceiver.isRegistered("resolverPayloadTest"))
    }
}
