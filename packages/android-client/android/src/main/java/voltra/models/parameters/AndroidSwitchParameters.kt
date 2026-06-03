//
//  AndroidSwitchParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidSwitch component
 * Android Switch component
 */
@Serializable
data class AndroidSwitchParameters(
    /** Unique identifier for interaction events */
    val id: String,
    /** Initial checked state */
    val checked: Boolean? = null,
    /** Text label */
    val text: String? = null,
    /** Checked thumb color */
    val thumbCheckedColor: String? = null,
    /** Unchecked thumb color */
    val thumbUncheckedColor: String? = null,
    /** Checked track color */
    val trackCheckedColor: String? = null,
    /** Unchecked track color */
    val trackUncheckedColor: String? = null,
    /** Maximum lines for text */
    val maxLines: Double? = null,
)
