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
    /** Leading icon */
    val startIcon: String? = null,
    /** Leading icon tint color */
    val iconColor: String? = null,
    /** Title text color */
    val textColor: String? = null,
    /** Title font family */
    val fontFamily: String? = null,
)
