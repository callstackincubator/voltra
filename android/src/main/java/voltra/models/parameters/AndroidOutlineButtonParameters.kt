//
//  AndroidOutlineButtonParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidOutlineButton component
 * Android Outline Button component
 */
@Serializable
data class AndroidOutlineButtonParameters(
    /** Text to display */
    val text: String,
    /** Whether the button is enabled */
    val enabled: Boolean? = null,
    /** Optional icon */
    val icon: String? = null,
    /** Text/icon color */
    val contentColor: String? = null,
    /** Maximum lines for text */
    val maxLines: Double? = null,
)
