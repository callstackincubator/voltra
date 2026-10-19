//
//  AndroidScaffoldParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidScaffold component
 * Android Scaffold container
 */
@Serializable
data class AndroidScaffoldParameters(
    /** Background color */
    @Contextual
    val backgroundColor: Any? = null,
    /** Horizontal padding */
    val horizontalPadding: Double? = null,
)
