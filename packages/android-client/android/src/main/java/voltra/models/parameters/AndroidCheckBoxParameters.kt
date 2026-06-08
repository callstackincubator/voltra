//
//  AndroidCheckBoxParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidCheckBox component
 * Android CheckBox component
 */
@Serializable
data class AndroidCheckBoxParameters(
    /** Unique identifier for interaction events */
    val id: String,
    /** Initial checked state */
    val checked: Boolean? = null,
    /** Text label */
    val text: String? = null,
    /** Checked color */
    val checkedColor: String? = null,
    /** Unchecked color */
    val uncheckedColor: String? = null,
    /** Maximum lines for text */
    val maxLines: Double? = null,
)
