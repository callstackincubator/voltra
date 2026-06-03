//
//  AndroidImageParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidImage component
 * Android Image component
 */
@Serializable
data class AndroidImageParameters(
    /** Image source */
    val source: String,
    /** Resizing mode */
    val resizeMode: String? = null,
    /** Accessibility description */
    val contentDescription: String? = null,
    /** How the image should scale within its bounds */
    val contentScale: String? = null,
    /** Image opacity from 0 to 1 */
    val alpha: Double? = null,
    /** Tint color filter */
    val colorFilter: String? = null,
)
