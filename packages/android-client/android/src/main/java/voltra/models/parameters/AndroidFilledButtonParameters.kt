//
//  AndroidFilledButtonParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidFilledButton component
 * Android Material Design filled button component for widgets
 */
@Serializable
data class AndroidFilledButtonParameters(
    /** Text to display */
    val text: String,
    /** Whether the button is enabled */
    val enabled: Boolean? = null,
    /** Optional icon */
    val icon: String? = null,
    /** Background color */
    @Contextual
    val backgroundColor: Any? = null,
    /** Text/icon color */
    @Contextual
    val contentColor: Any? = null,
    /** Maximum lines for text */
    val maxLines: Double? = null,
)
