package voltra.modifiers

import androidx.glance.GlanceModifier
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Parity between `VoltraAndroid.modifiers` and the Kotlin registry. The fixture is written by the
 * `@use-voltra/android` test suite (`UPDATE_MODIFIER_FIXTURES=1 pnpm --filter @use-voltra/android test`).
 */
@RunWith(RobolectricTestRunner::class)
class VoltraModifierRegistryTest {
    private fun fixtureDescriptors(): List<VoltraModifierDescriptor> {
        val json =
            requireNotNull(javaClass.classLoader?.getResource("native-modifiers.json")) {
                "native-modifiers.json fixture is missing"
            }.readText()
        return VoltraModifierRegistry.parseDescriptors(json)
    }

    private fun GlanceModifier.elementNames(): List<String> =
        foldIn(emptyList()) { names, element ->
            names +
                element.javaClass.simpleName
        }

    @Test
    fun everyTypeScriptModifierIsRegisteredAndDecodes() {
        val descriptors = fixtureDescriptors()
        assertTrue(descriptors.isNotEmpty())
        for (descriptor in descriptors) {
            assertNotNull("Modifier ${descriptor.type} did not decode", VoltraModifierRegistry.create(descriptor))
        }
    }

    @Test
    fun everyRegisteredModifierHasATypeScriptFactory() {
        assertEquals(fixtureDescriptors().map { it.type }.toSet(), VoltraModifierRegistry.registeredTypes)
    }

    @Test
    fun parseDescriptorsKeepsOrderAndDropsEntriesWithoutType() {
        val descriptors =
            VoltraModifierRegistry.parseDescriptors(
                """[{"${'$'}type":"padding","all":8},{"all":4},{"${'$'}type":"visibility","visibility":"gone"}]""",
            )
        assertEquals(listOf("padding", "visibility"), descriptors.map { it.type })
        assertEquals(mapOf("all" to 8), descriptors[0].params.mapValues { (it.value as Number).toInt() })
    }

    @Test
    fun parseDescriptorsIgnoresMalformedJson() {
        assertTrue(VoltraModifierRegistry.parseDescriptors("not json").isEmpty())
        assertTrue(VoltraModifierRegistry.parseDescriptors("""{"${'$'}type":"padding"}""").isEmpty())
        assertTrue(VoltraModifierRegistry.parseDescriptors(null).isEmpty())
    }

    @Test(expected = VoltraModifierException::class)
    fun rejectsUnexpectedParameters() {
        // A parameter renamed on the TypeScript side must not fall back to a default silently.
        VoltraModifierRegistry.create(VoltraModifierDescriptor("padding", mapOf("value" to 8)))
    }

    @Test
    fun unknownAndInvalidModifiersAreSkipped() {
        val base = GlanceModifier
        val result =
            base.applyNativeModifiers(
                listOf(
                    VoltraModifierDescriptor("doesNotExist", emptyMap()),
                    VoltraModifierDescriptor("visibility", mapOf("visibility" to "sideways")),
                    VoltraModifierDescriptor("padding", mapOf("all" to "wide")),
                    VoltraModifierDescriptor("padding", mapOf("value" to 8)),
                ),
            )
        assertSame(base, result)
    }

    @Test
    fun appendsModifiersAfterTheExistingChain() {
        val result =
            GlanceModifier.applyNativeModifiers(
                listOf(
                    VoltraModifierDescriptor("padding", mapOf("all" to 8)),
                    VoltraModifierDescriptor("visibility", mapOf("visibility" to "gone")),
                ),
            )
        assertEquals(listOf("PaddingModifier", "VisibilityModifier"), result.elementNames())
    }

    @Test
    @Config(sdk = [31])
    fun appliesCornerRadiusFromAndroid12() {
        val result =
            GlanceModifier.applyNativeModifiers(
                listOf(
                    VoltraModifierDescriptor(
                        "cornerRadius",
                        mapOf("radius" to 12),
                    ),
                ),
            )
        assertEquals(listOf("CornerRadiusModifier"), result.elementNames())
    }

    @Test
    @Config(sdk = [30])
    fun skipsCornerRadiusBeforeAndroid12() {
        val result =
            GlanceModifier.applyNativeModifiers(
                listOf(
                    VoltraModifierDescriptor(
                        "cornerRadius",
                        mapOf("radius" to 12),
                    ),
                ),
            )
        assertTrue(result.elementNames().isEmpty())
    }
}
