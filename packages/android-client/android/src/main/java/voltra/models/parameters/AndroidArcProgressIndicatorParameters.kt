//
//  AndroidArcProgressIndicatorParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for AndroidArcProgressIndicator component
 * Android arc progress indicator drawn as a bitmap
 */
@Serializable
data class AndroidArcProgressIndicatorParameters(
    /** Fill fraction from 0 to 1, clamped */
    val progress: Double? = null,
    /** Stroke color of the filled arc */
    val color: String? = null,
    /** Stroke color of the unfilled arc; transparent hides the track */
    val trackColor: String? = null,
    /** Stroke width in dp of both arcs */
    val strokeWidth: Double? = null,
    /** Angle in degrees where the arc begins; 0 is 3 o'clock, positive is clockwise */
    val startAngle: Double? = null,
    /** Total angular length of the track in degrees; 360 makes a closed ring */
    val sweepAngle: Double? = null,
    /** End shape of both arcs */
    val lineCap: String? = null,
    /** Sweep gradient colors along the filled arc, from startAngle; overrides color */
    val gradientColors: String? = null,
)
