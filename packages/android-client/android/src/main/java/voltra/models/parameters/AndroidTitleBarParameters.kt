//
//  AndroidTitleBarParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Contextual
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
    val startIcon: String,
    /** Leading icon tint color */
    @Contextual
    val iconColor: Any? = null,
    /** Title text color */
    @Contextual
    val textColor: Any? = null,
    /** Title font family */
    val fontFamily: String? = null,
)
