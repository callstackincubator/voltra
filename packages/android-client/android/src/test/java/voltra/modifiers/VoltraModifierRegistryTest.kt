package voltra.modifiers

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
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
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.models.componentProp
import voltra.payload.ComponentTypeID
import voltra.styling.SizeValue
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
    fun fixtureCoversEveryParameterOfEveryModifier() {
        // A parameter renamed or added on one side only must fail here, not reach a device.
        val fixtureParameters =
            fixtureDescriptors()
                .groupBy { it.type }
                .mapValues { (_, descriptors) -> descriptors.flatMap { it.params.keys }.toSet() }
        for ((type, definition) in builtInModifierDefinitions) {
            assertEquals("Parameters of $type", definition.parameters, fixtureParameters[type].orEmpty())
        }
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

    private val backgroundModifiers = """[{"${'$'}type":"appWidgetBackground"}]"""

    private fun element(
        type: Int = ComponentTypeID.BOX,
        id: String? = null,
        children: VoltraNode? = null,
        props: Map<String, Any?>? = mapOf("modifiers" to backgroundModifiers),
    ) = VoltraElement(t = type, i = id, c = children, p = props)

    private fun renderBackground(
        renderState: VoltraModifierRenderState,
        element: VoltraElement,
    ): List<String> =
        GlanceModifier
            .applyNativeModifiers(
                element.nativeModifiers,
                VoltraModifierScope(
                    mayCarryAppWidgetBackground = { renderState.mayCarryAppWidgetBackground(element) },
                ) {
                    ColorProvider(Color.Magenta)
                },
            ).elementNames()

    @Test
    fun keepsOnlyTheFirstAppWidgetBackground() {
        val first = element(id = "first")
        val second = element(id = "second")
        val renderState =
            VoltraModifierRenderState.forTree(
                VoltraNode.Element(
                    element(
                        type = ComponentTypeID.COLUMN,
                        props = null,
                        children = VoltraNode.Array(listOf(VoltraNode.Element(first), VoltraNode.Element(second))),
                    ),
                ),
                null,
            )

        assertEquals(1, renderBackground(renderState, first).size)
        assertTrue(
            "A second component must not mark the widget background again",
            renderBackground(renderState, second).isEmpty(),
        )
        assertEquals("The same component keeps it on recomposition", 1, renderBackground(renderState, first).size)
    }

    @Test
    fun keepsTheBackgroundWhenAnEqualTreeIsParsedAgain() {
        fun tree() =
            VoltraNode.Element(
                element(
                    id = "root",
                    props =
                        mapOf("modifiers" to String(backgroundModifiers.toCharArray())),
                ),
            )
        val renderState = VoltraModifierRenderState.forTree(tree(), null)
        // A structurally equal tree from a later render: new instances, same content.
        val reparsed = tree().element
        assertEquals(1, renderBackground(renderState, reparsed).size)
    }

    @Test
    fun skipsASharedElementThatIsRenderedTwice() {
        val shared = listOf<VoltraNode>(VoltraNode.Element(element(id = "shared")))
        val later = element(id = "later")
        val root =
            VoltraNode.Element(
                element(
                    type = ComponentTypeID.COLUMN,
                    props = null,
                    children =
                        VoltraNode.Array(
                            listOf(VoltraNode.Ref(0), VoltraNode.Ref(0), VoltraNode.Element(later)),
                        ),
                ),
            )
        val renderState = VoltraModifierRenderState.forTree(root, shared)

        assertTrue(renderBackground(renderState, (shared[0] as VoltraNode.Element).element).isEmpty())
        assertEquals(1, renderBackground(renderState, later).size)
    }

    @Test
    fun leavesTheBackgroundToAScaffold() {
        val column = element(type = ComponentTypeID.COLUMN)
        val root =
            VoltraNode.Element(
                element(type = ComponentTypeID.SCAFFOLD, props = null, children = VoltraNode.Element(column)),
            )
        val renderState = VoltraModifierRenderState.forTree(root, null)

        assertTrue(renderBackground(renderState, column).isEmpty())
    }

    @Test
    fun findsTheBackgroundInAnImageFallback() {
        val fallback = mapOf("t" to ComponentTypeID.BOX, "p" to mapOf("modifiers" to backgroundModifiers))
        val image = element(type = ComponentTypeID.IMAGE, props = mapOf("fallback" to fallback))
        val sibling = element(id = "sibling")
        val root =
            VoltraNode.Element(
                element(
                    type = ComponentTypeID.COLUMN,
                    props = null,
                    children = VoltraNode.Array(listOf(VoltraNode.Element(image), VoltraNode.Element(sibling))),
                ),
            )
        val renderState = VoltraModifierRenderState.forTree(root, null)
        val renderedFallback = (image.componentProp("fallback", null, null) as VoltraNode.Element).element

        assertEquals(1, renderBackground(renderState, renderedFallback).size)
        assertTrue(renderBackground(renderState, sibling).isEmpty())
    }

    @Test
    fun ignoresTheFallbackOfAnImageWithASource() {
        val fallback = mapOf("t" to ComponentTypeID.BOX, "p" to mapOf("modifiers" to backgroundModifiers))
        val image = element(type = ComponentTypeID.IMAGE, props = mapOf("source" to "logo", "fallback" to fallback))
        val sibling = element(id = "sibling")
        val root =
            VoltraNode.Element(
                element(
                    type = ComponentTypeID.COLUMN,
                    props = null,
                    children = VoltraNode.Array(listOf(VoltraNode.Element(image), VoltraNode.Element(sibling))),
                ),
            )
        val renderState = VoltraModifierRenderState.forTree(root, null)

        assertEquals(
            "The fallback is not drawn, so the sibling keeps the marker",
            1,
            renderBackground(renderState, sibling).size,
        )
    }

    @Test
    fun readsTheSizeTheModifiersSetLastOneWins() {
        val sized =
            element(
                props =
                    mapOf(
                        "modifiers" to
                            """[{"${'$'}type":"width","width":40},{"${'$'}type":"fillMaxWidth"},""" +
                            """{"${'$'}type":"size","width":10,"height":20},{"${'$'}type":"height","height":"tall"}]""",
                    ),
            )
        val size = sized.nativeModifierSize()
        assertEquals(SizeValue.Fixed(10.dp), size.width)
        // The last height does not decode, so the size modifier's height stands.
        assertEquals(SizeValue.Fixed(20.dp), size.height)
        assertEquals(NativeModifierSize(null, null), element(props = null).nativeModifierSize())
    }

    @Test
    fun readsTheContentDescriptionOfASemanticsModifier() {
        val described =
            element(
                props =
                    mapOf(
                        "modifiers" to
                            """[{"${'$'}type":"semantics","contentDescription":"Revenue up 12%"},""" +
                            """{"${'$'}type":"semantics","testTag":"chart"}]""",
                    ),
            )
        assertEquals("Revenue up 12%", described.nativeContentDescription())
        assertEquals(null, element(props = null).nativeContentDescription())
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
