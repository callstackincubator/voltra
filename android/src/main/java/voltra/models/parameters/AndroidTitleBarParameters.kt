//
//  AndroidTitleBarParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidTitleBar component
 * Android Title Bar component
 */
@Serializable
data class AndroidTitleBarParameters(
    /** Title text */
    val title: String,
    /** Background color */
    val backgroundColor: String? = null,
    /** Text color */
    val contentColor: String? = null,
)
