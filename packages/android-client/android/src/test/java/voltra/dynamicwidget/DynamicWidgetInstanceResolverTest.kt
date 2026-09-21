package voltra.dynamicwidget

import android.content.ComponentName
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.VoltraWidgetReceiver
import voltra.widget.VoltraWidgetReceivers

/**
 * The rejection table of [DynamicWidgetInstanceResolver] (ADR 0006), exercised without a device
 * through [DynamicWidgetInstanceBoundary].
 *
 * Kind resolution goes through the real [VoltraWidgetKindResolver] against the same
 * generated-receiver-style fixtures [voltra.widget.VoltraWidgetKindResolverTest] uses
 * ([com.example.app.widget.VoltraWidgetKindResolverTestReceivers]), registered through
 * `ShadowPackageManager` — so a payload-driven placement is rejected for the reason a real one
 * would be, not because a stub said so. Only the placement lookup is faked, since Robolectric
 * cannot place a widget.
 */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetInstanceResolverTest {
    private val application = RuntimeEnvironment.getApplication()
    private val fixturePackage = "com.example.app"

    @Before
    fun resetReceiverNameCache() {
        VoltraWidgetReceivers.clearCache()
    }

    private fun registerFixtureReceiver(simpleClassName: String): ComponentName {
        val component = ComponentName(application.packageName, "$fixturePackage.widget.$simpleClassName")
        shadowOf(application.packageManager).addReceiverIfNotPresent(component)
        return component
    }

    /** The real receiver map and kind resolver; only the placed-widget lookup is supplied. */
    private fun boundary(placements: Map<Int, ComponentName>) =
        object : DynamicWidgetInstanceBoundary {
            override fun providerComponentName(appWidgetId: Int): ComponentName? = placements[appWidgetId]

            override fun installedReceivers(): Map<String, ComponentName> =
                VoltraWidgetReceivers.installedReceivers(application)

            override fun resolveWidgetKind(widgetId: String): VoltraWidgetKindResolution =
                VoltraWidgetKindResolver.resolve(application, widgetId)
        }

    @Test
    fun resolvesTheWidgetIdOfAPlacedDynamicWidget() {
        val provider = registerFixtureReceiver("VoltraWidget_resolverDynamicTestReceiver")
        val resolver = DynamicWidgetInstanceResolver(boundary(mapOf(42 to provider)))

        assertEquals("resolverDynamicTest", resolver.resolveDynamicWidgetId(42))
    }

    @Test
    fun rejectsAnAppWidgetIdThatIsNotPlacedAtAll() {
        registerFixtureReceiver("VoltraWidget_resolverDynamicTestReceiver")
        val resolver = DynamicWidgetInstanceResolver(boundary(placements = emptyMap()))

        val rejection =
            assertThrows(DynamicWidgetInstanceRejection.InstanceNotFound::class.java) {
                resolver.resolveDynamicWidgetId(42)
            }

        assertTrue(rejection.message!!.contains("No widget is placed with appWidgetId 42"))
    }

    @Test
    fun rejectsAPlacementWhoseProviderBelongsToAnotherApp() {
        registerFixtureReceiver("VoltraWidget_resolverDynamicTestReceiver")
        // Same generated class name, a different app: an integer guessed by this app must not
        // reach a placement it does not own.
        val foreignProvider =
            ComponentName("com.other.app", "com.other.app.widget.VoltraWidget_resolverDynamicTestReceiver")
        val resolver = DynamicWidgetInstanceResolver(boundary(mapOf(42 to foreignProvider)))

        val rejection =
            assertThrows(DynamicWidgetInstanceRejection.InstanceNotFound::class.java) {
                resolver.resolveDynamicWidgetId(42)
            }

        assertTrue(rejection.message!!.contains("not one of this app's Voltra widget receivers"))
    }

    @Test
    fun rejectsAPlacementOfANonVoltraProviderOfThisApp() {
        registerFixtureReceiver("VoltraWidget_resolverDynamicTestReceiver")
        val nonVoltraProvider = ComponentName(application.packageName, "$fixturePackage.widget.SomeOtherWidgetProvider")
        val resolver = DynamicWidgetInstanceResolver(boundary(mapOf(42 to nonVoltraProvider)))

        assertThrows(DynamicWidgetInstanceRejection.InstanceNotFound::class.java) {
            resolver.resolveDynamicWidgetId(42)
        }
    }

    @Test
    fun rejectsAPlacementOfAPayloadDrivenWidget() {
        val provider = registerFixtureReceiver("VoltraWidget_resolverPayloadTestReceiver")
        val resolver = DynamicWidgetInstanceResolver(boundary(mapOf(42 to provider)))

        val rejection =
            assertThrows(DynamicWidgetInstanceRejection.KindMismatch::class.java) {
                resolver.resolveDynamicWidgetId(42)
            }

        assertTrue(rejection.message!!.contains("payload-driven"))
    }

    @Test
    fun rejectsAPlacementWhoseKindCannotBeResolved() {
        // Matches the generated naming convention, so it is in the receiver map, but is not a
        // VoltraWidgetReceiver — the kind resolver reports Unresolved rather than either kind.
        val provider = registerFixtureReceiver("VoltraWidget_resolverNotAReceiverTestReceiver")
        val resolver = DynamicWidgetInstanceResolver(boundary(mapOf(42 to provider)))

        assertThrows(DynamicWidgetInstanceRejection.WidgetNotFound::class.java) {
            resolver.resolveDynamicWidgetId(42)
        }
    }

    @Test
    fun resolvesThePlacementItWasAskedAboutWhenSeveralWidgetsArePlaced() {
        val dynamicProvider = registerFixtureReceiver("VoltraWidget_resolverDynamicTestReceiver")
        val payloadProvider = registerFixtureReceiver("VoltraWidget_resolverPayloadTestReceiver")
        val resolver =
            DynamicWidgetInstanceResolver(
                boundary(mapOf(1 to payloadProvider, 2 to dynamicProvider)),
            )

        assertEquals("resolverDynamicTest", resolver.resolveDynamicWidgetId(2))
        assertThrows(DynamicWidgetInstanceRejection.KindMismatch::class.java) {
            resolver.resolveDynamicWidgetId(1)
        }
    }

    @Test
    fun resolvingAPlacementDoesNotPopulateTheGlanceWidgetRegistry() {
        val provider = registerFixtureReceiver("VoltraWidget_resolverDynamicTestReceiver")
        val resolver = DynamicWidgetInstanceResolver(boundary(mapOf(42 to provider)))

        resolver.resolveDynamicWidgetId(42)

        // ADR 0000: validating an instance must not register the widget as a side effect.
        assertFalse(VoltraWidgetReceiver.isRegistered("resolverDynamicTest"))
    }
}
