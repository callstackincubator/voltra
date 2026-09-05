package voltra.glance.components

import android.graphics.Paint
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ArcGeometryTest {
    @Test
    fun appliesTheDocumentedDefaultsForABareComponent() {
        val geometry = readArcGeometry(null)

        assertEquals(0f, geometry.progress, 0f)
        assertEquals(8f, geometry.strokeWidthDp, 0f)
        assertEquals(135f, geometry.startAngle, 0f)
        assertEquals(270f, geometry.sweepAngle, 0f)
        assertEquals(Paint.Cap.ROUND, geometry.cap)
    }

    @Test
    fun readsEveryGeometryProp() {
        val geometry =
            readArcGeometry(
                mapOf(
                    "progress" to 0.4,
                    "strokeWidth" to 12,
                    "startAngle" to 90,
                    "sweepAngle" to 360,
                    "lineCap" to "butt",
                ),
            )

        assertEquals(0.4f, geometry.progress, 0.0001f)
        assertEquals(12f, geometry.strokeWidthDp, 0f)
        assertEquals(90f, geometry.startAngle, 0f)
        assertEquals(360f, geometry.sweepAngle, 0f)
        assertEquals(Paint.Cap.BUTT, geometry.cap)
    }

    @Test
    fun clampsProgressIntoTheUnitRange() {
        assertEquals(1f, readArcGeometry(mapOf("progress" to 4)).progress, 0f)
        assertEquals(0f, readArcGeometry(mapOf("progress" to -2)).progress, 0f)
    }

    @Test
    fun clampsANegativeStrokeWidthToZero() {
        assertEquals(0f, readArcGeometry(mapOf("strokeWidth" to -5)).strokeWidthDp, 0f)
    }

    @Test
    fun fallsBackToTheDefaultsForWronglyTypedProps() {
        val geometry =
            readArcGeometry(
                mapOf(
                    "progress" to "0.5",
                    "strokeWidth" to null,
                    "lineCap" to 7,
                ),
            )

        assertEquals(0f, geometry.progress, 0f)
        assertEquals(8f, geometry.strokeWidthDp, 0f)
        assertEquals(Paint.Cap.ROUND, geometry.cap)
    }

    @Test
    fun treatsAnUnknownLineCapAsRound() {
        assertEquals(Paint.Cap.ROUND, readArcGeometry(mapOf("lineCap" to "square")).cap)
    }
}
