//
//  ChartParameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for Chart component
 * Charts component for data visualization
 */
@Serializable
data class ChartParameters(
    /** Compact mark data encoded from children by toJSON */
    val marks: String? = null,

    /** Show or hide the x-axis */
    val xAxisVisibility: String? = null,

    /** Show or hide the y-axis */
    val yAxisVisibility: String? = null,

    /** Show or hide the chart legend */
    val legendVisibility: String? = null,

    /** Map of series name to color string */
    val foregroundStyleScale: String? = null,

    /** Enable scrolling on the given axis */
    val chartScrollableAxes: String? = null
)
