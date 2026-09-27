package voltra.modifiers

import androidx.compose.ui.unit.dp
import voltra.models.VoltraElement
import voltra.styling.SizeValue

/**
 * The size an element's native size modifiers set, per axis; null leaves the axis to style.
 * Renderers that size themselves, such as charts and bitmaps, read it so their own width and height
 * agree with the modifiers instead of replacing them.
 */
data class NativeModifierSize(
    val width: SizeValue?,
    val height: SizeValue?,
)

/** Like Glance, the last width or height modifier in the list wins. Skipped descriptors do not count. */
fun VoltraElement.nativeModifierSize(): NativeModifierSize {
    var width: SizeValue? = null
    var height: SizeValue? = null
    for (descriptor in appliedNativeModifiers()) {
        val params = descriptor.params
        when (descriptor.type) {
            "width" -> {
                width = SizeValue.Fixed(params.requiredDp("width").dp)
            }

            "height" -> {
                height = SizeValue.Fixed(params.requiredDp("height").dp)
            }

            "size" -> {
                width = SizeValue.Fixed(params.requiredDp("width").dp)
                height = SizeValue.Fixed(params.requiredDp("height").dp)
            }

            "fillMaxWidth" -> {
                width = SizeValue.Fill
            }

            "fillMaxHeight" -> {
                height = SizeValue.Fill
            }

            "fillMaxSize" -> {
                width = SizeValue.Fill
                height = SizeValue.Fill
            }

            "wrapContentWidth" -> {
                width = SizeValue.Wrap
            }

            "wrapContentHeight" -> {
                height = SizeValue.Wrap
            }

            "wrapContentSize" -> {
                width = SizeValue.Wrap
                height = SizeValue.Wrap
            }
        }
    }
    return NativeModifierSize(width, height)
}

/**
 * The description a `semantics` modifier sets, for renderers that pass their own description to a
 * Glance component, which would otherwise replace the modifier's.
 */
fun VoltraElement.nativeContentDescription(): String? =
    appliedNativeModifiers()
        .lastOrNull { it.type == "semantics" && it.params["contentDescription"] is String }
        ?.params
        ?.get("contentDescription") as? String

private val READ_TYPES =
    setOf(
        "width",
        "height",
        "size",
        "fillMaxWidth",
        "fillMaxHeight",
        "fillMaxSize",
        "wrapContentWidth",
        "wrapContentHeight",
        "wrapContentSize",
        "semantics",
    )

/** Descriptors read here that decode, so the values match what the modifier chain applies. */
private fun VoltraElement.appliedNativeModifiers(): List<VoltraModifierDescriptor> =
    nativeModifiers.filter { it.type in READ_TYPES && runCatching { VoltraModifierRegistry.create(it) }.isSuccess }
