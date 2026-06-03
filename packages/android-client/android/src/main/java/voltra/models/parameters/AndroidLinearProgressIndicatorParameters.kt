//
//  AndroidLinearProgressIndicatorParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidLinearProgressIndicator component
 * Android Linear Progress Indicator
 */
@Serializable
data class AndroidLinearProgressIndicatorParameters(
    /** Progress value from 0 to 1 */
    val progress: Double? = null,
    /** Progress color */
    val color: String? = null,
    /** Track background color */
    val backgroundColor: String? = null,
)
