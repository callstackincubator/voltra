package voltra.modifiers

import android.util.Log
import androidx.glance.GlanceModifier
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import voltra.parsing.toDynamicObject

/**
 * One entry of a component's `modifiers` prop: `{ "$type": "<name>", ...params }` (ADR 0005).
 */
data class VoltraModifierDescriptor(
    val type: String,
    val params: Map<String, Any?>,
)

class VoltraModifierException(
    message: String,
) : IllegalArgumentException(message)

typealias VoltraModifierFactory = (Map<String, Any?>) -> GlanceModifier

/**
 * String-keyed table of native modifier factories. Unknown types and parameters that do not decode
 * are logged and skipped, so a bad descriptor never breaks the widget.
 */
object VoltraModifierRegistry {
    private const val TAG = "VoltraModifiers"

    private val factories: MutableMap<String, VoltraModifierFactory> = builtInModifierFactories.toMutableMap()

    val registeredTypes: Set<String>
        get() = factories.keys.toSet()

    /** Not public yet: user-registered modifiers are future work (ADR 0005). */
    internal fun register(
        type: String,
        factory: VoltraModifierFactory,
    ) {
        factories[type] = factory
    }

    /** Decodes the JSON-encoded `modifiers` prop. Entries without a string `$type` are dropped. */
    fun parseDescriptors(json: String?): List<VoltraModifierDescriptor> {
        if (json.isNullOrEmpty()) return emptyList()
        val array =
            try {
                Json.parseToJsonElement(json) as? JsonArray
            } catch (error: Exception) {
                warn("Ignoring modifiers that are not valid JSON", error)
                null
            } ?: return emptyList()

        return array.mapNotNull { entry ->
            val map = (entry as? JsonObject)?.toDynamicObject() ?: return@mapNotNull null
            val type = map["\$type"] as? String ?: return@mapNotNull null
            VoltraModifierDescriptor(type, map - "\$type")
        }
    }

    /**
     * Builds the modifier for a descriptor. Throws [VoltraModifierException] for an unknown type or
     * a parameter that does not decode; [applyNativeModifiers] turns that into a logged no-op.
     */
    fun create(descriptor: VoltraModifierDescriptor): GlanceModifier {
        val factory =
            factories[descriptor.type]
                ?: throw VoltraModifierException("Unknown modifier ${descriptor.type}")
        return factory(descriptor.params)
    }

    internal fun createOrNull(descriptor: VoltraModifierDescriptor): GlanceModifier? =
        try {
            create(descriptor)
        } catch (error: IllegalArgumentException) {
            warn("Ignoring modifier ${descriptor.type}", error)
            null
        }

    private fun warn(
        message: String,
        error: Throwable,
    ) {
        try {
            Log.w(TAG, message, error)
        } catch (_: RuntimeException) {
            // Local unit tests may not provide android.util.Log.
        }
    }
}

/**
 * Appends native modifiers after `style`. Glance reads the chain as a set keyed by modifier kind,
 * so order does not matter except that padding adds up.
 */
fun GlanceModifier.applyNativeModifiers(descriptors: List<VoltraModifierDescriptor>): GlanceModifier =
    descriptors.fold(this) { modifier, descriptor ->
        VoltraModifierRegistry.createOrNull(descriptor)?.let { modifier.then(it) } ?: modifier
    }

internal fun Map<String, Any?>.optionalDp(key: String): Float? {
    val value = this[key] ?: return null
    return (value as? Number)?.toFloat() ?: throw VoltraModifierException("Invalid $key")
}

internal fun Map<String, Any?>.requiredDp(key: String): Float =
    optionalDp(key) ?: throw VoltraModifierException("Missing $key")

internal fun Map<String, Any?>.requiredString(key: String): String {
    val value = this[key] ?: throw VoltraModifierException("Missing $key")
    return value as? String ?: throw VoltraModifierException("Invalid $key")
}
