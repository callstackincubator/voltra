//
//  AndroidSwitchParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Contextual
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
    @Contextual
    val thumbCheckedColor: Any? = null,
    /** Unchecked thumb color */
    @Contextual
    val thumbUncheckedColor: Any? = null,
    /** Checked track color */
    @Contextual
    val trackCheckedColor: Any? = null,
    /** Unchecked track color */
    @Contextual
    val trackUncheckedColor: Any? = null,
    /** Maximum lines for text */
    val maxLines: Double? = null,
)
