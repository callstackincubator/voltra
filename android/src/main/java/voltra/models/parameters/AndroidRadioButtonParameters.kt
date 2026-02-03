//
//  AndroidRadioButtonParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidRadioButton component
 * Android RadioButton component
 */
@Serializable
data class AndroidRadioButtonParameters(
    /** Unique identifier for interaction events */
    val id: String,
    /** Initial checked state */
    val checked: Boolean? = null,
    /** Whether the radio button is enabled */
    val enabled: Boolean? = null,
)
