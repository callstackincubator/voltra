//
//  AndroidTextParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidText component
 * Android Text component
 */
@Serializable
data class AndroidTextParameters(
    /** Text content */
    val text: String,
    /** Text color */
    val color: String? = null,
    /** Font size */
    val fontSize: Double? = null,
    /** Maximum lines */
    val maxLines: Double? = null,
)
