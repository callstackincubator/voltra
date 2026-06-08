package voltra.styling

data class UnitPoint(
    val x: Float,
    val y: Float,
) {
    companion object {
        val Center = UnitPoint(0.5f, 0.5f)
    }
}

enum class GradientKind {
    LINEAR,
    RADIAL,
    CONIC,
}

enum class RadialGradientShape {
    CIRCLE,
    ELLIPSE,
}

enum class RadialGradientExtent {
    CLOSEST_SIDE,
    FARTHEST_SIDE,
    CLOSEST_CORNER,
    FARTHEST_CORNER,
}

data class GradientStop(
    val color: VoltraColorValue,
    val location: Float,
)

sealed class BackgroundImageValue {
    abstract val stops: List<GradientStop>

    data class LinearGradient(
        val startPoint: UnitPoint,
        val endPoint: UnitPoint,
        override val stops: List<GradientStop>,
    ) : BackgroundImageValue()

    data class RadialGradient(
        val center: UnitPoint,
        val shape: RadialGradientShape,
        val extent: RadialGradientExtent,
        override val stops: List<GradientStop>,
    ) : BackgroundImageValue()

    data class ConicGradient(
        val center: UnitPoint,
        val angleDegrees: Float,
        override val stops: List<GradientStop>,
    ) : BackgroundImageValue()
}
