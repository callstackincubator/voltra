//
//  AndroidCircleIconButtonParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidCircleIconButton component
 * Android Circle Icon Button component
 */
@Serializable
data class AndroidCircleIconButtonParameters(
    /** Icon source */
    val icon: String,
    /** Accessibility description */
    val contentDescription: String? = null,
    /** Whether the button is enabled */
    val enabled: Boolean? = null,
    /** Background color */
    val backgroundColor: String? = null,
    /** Icon color */
    val contentColor: String? = null,
)
