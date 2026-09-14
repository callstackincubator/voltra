package voltra.modifiers

import androidx.compose.ui.graphics.Color
import androidx.glance.GlanceModifier
import androidx.glance.unit.ColorProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import voltra.styling.VoltraThemeColorRole

/**
 * Parity between `VoltraAndroid.modifiers` and the Kotlin registry. The fixture is written by the
 * `@use-voltra/android` test suite (`UPDATE_MODIFIER_FIXTURES=1 pnpm --filter @use-voltra/android test`).
 */
@RunWith(RobolectricTestRunner::class)
class VoltraModifierRegistryTest {
    private val resolvedRoles = mutableListOf<VoltraThemeColorRole>()

    /** Stands in for the Glance theme, which only exists inside a composition. */
    private val themeScope =
        VoltraModifierScope { role ->
            resolvedRoles += role
            ColorProvider(Color.Magenta)
        }

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

    private fun modifierFor(
        type: String,
        params: Map<String, Any?> = emptyMap(),
    ): GlanceModifier = VoltraModifierRegistry.create(VoltraModifierDescriptor(type, params), themeScope)

    @Test
    fun everyTypeScriptModifierIsRegisteredAndDecodes() {
        val descriptors = fixtureDescriptors()
        assertTrue(descriptors.isNotEmpty())
        for (descriptor in descriptors) {
            assertNotNull(
                "Modifier ${descriptor.type} did not decode",
                VoltraModifierRegistry.create(descriptor, themeScope),
            )
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
        modifierFor("padding", mapOf("value" to 8))
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
                    VoltraModifierDescriptor("background", mapOf("color" to "not-a-color")),
                    VoltraModifierDescriptor("semantics", emptyMap()),
                ),
                themeScope,
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
                themeScope,
            )
        assertEquals(listOf("PaddingModifier", "VisibilityModifier"), result.elementNames())
    }

    @Test
    @Config(sdk = [31])
    fun appliesCornerRadiusFromAndroid12() {
        assertEquals(listOf("CornerRadiusModifier"), modifierFor("cornerRadius", mapOf("radius" to 12)).elementNames())
    }

    @Test
    @Config(sdk = [30])
    fun skipsCornerRadiusBeforeAndroid12() {
        assertTrue(modifierFor("cornerRadius", mapOf("radius" to 12)).elementNames().isEmpty())
    }

    @Test
    fun resolvesThemeColorTokensThroughTheScope() {
        val result = modifierFor("background", mapOf("color" to "~pc"))
        assertEquals(listOf(VoltraThemeColorRole.PRIMARY_CONTAINER), resolvedRoles)
        assertEquals(1, result.elementNames().size)
    }

    @Test
    fun rejectsThemeColorTokensWithoutAComposition() {
        val result =
            GlanceModifier.applyNativeModifiers(
                listOf(VoltraModifierDescriptor("background", mapOf("color" to "~p"))),
            )
        assertSame(GlanceModifier, result)
    }

    @Test
    fun rejectsMixingColorWithDayAndNight() {
        val result =
            GlanceModifier.applyNativeModifiers(
                listOf(VoltraModifierDescriptor("background", mapOf("color" to "#000000", "day" to "#FFFFFF"))),
                themeScope,
            )
        assertSame(GlanceModifier, result)
    }

    @Test
    fun appliesSizeSemanticsAndWidgetBackground() {
        val names =
            GlanceModifier
                .applyNativeModifiers(
                    listOf(
                        VoltraModifierDescriptor("size", mapOf("width" to 64, "height" to 32)),
                        VoltraModifierDescriptor("fillMaxWidth", emptyMap()),
                        VoltraModifierDescriptor("semantics", mapOf("contentDescription" to "Portfolio")),
                        VoltraModifierDescriptor("appWidgetBackground", emptyMap()),
                    ),
                    themeScope,
                ).elementNames()
        assertTrue(names.any { it.contains("Width") })
        assertTrue(names.any { it.contains("Height") })
        assertTrue(names.any { it.contains("Semantics") })
        assertTrue(names.any { it.contains("AppWidgetBackground") })
    }
}
