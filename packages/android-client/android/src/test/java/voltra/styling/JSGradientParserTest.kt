package voltra.styling

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class JSGradientParserTest {
    @Test
    fun parsesLinearGradientWithRgbaStops() {
        val parsed =
            JSGradientParser.parse(
                "linear-gradient(to right, rgba(255,0,0,0.8) 0%, rgba(0,0,255,0.3) 100%)",
            )

        assertTrue(parsed is BackgroundImageValue.LinearGradient)
    }

    @Test
    fun parsesLinearGradientWithSpaceSlashRgbaStops() {
        val parsed =
            JSGradientParser.parse(
                "linear-gradient(90deg, rgba(255 0 0 / 80%) 0%, rgba(0 0 255 / 30%) 100%)",
            )

        assertTrue(parsed is BackgroundImageValue.LinearGradient)
    }

    @Test
    fun parsesRadialGradientWithTransparentStop() {
        val parsed =
            JSGradientParser.parse(
                "radial-gradient(circle at center, rgba(255,0,0,.8) 10%, transparent 90%)",
            )

        assertTrue(parsed is BackgroundImageValue.RadialGradient)
    }

    @Test
    fun parsesConicGradientWithDegreeStops() {
        val parsed =
            JSGradientParser.parse(
                "conic-gradient(from 90deg at center, rgba(255,0,0,.8) 0deg, rgba(0,0,255,.3) 360deg)",
            )

        assertTrue(parsed is BackgroundImageValue.ConicGradient)
    }

    @Test
    fun parsesLinearDirectionAndAngle() {
        val direction = JSGradientParser.parse("linear-gradient(to bottom right, red 0%, blue 100%)")
        val angle = JSGradientParser.parse("linear-gradient(90deg, red 0%, blue 100%)")

        assertTrue(direction is BackgroundImageValue.LinearGradient)
        direction as BackgroundImageValue.LinearGradient
        assertEquals(0f, direction.startPoint.x, 0.0001f)
        assertEquals(0f, direction.startPoint.y, 0.0001f)
        assertEquals(1f, direction.endPoint.x, 0.0001f)
        assertEquals(1f, direction.endPoint.y, 0.0001f)

        assertTrue(angle is BackgroundImageValue.LinearGradient)
        angle as BackgroundImageValue.LinearGradient
        assertEquals(0f, angle.startPoint.x, 0.0001f)
        assertEquals(0.5f, angle.startPoint.y, 0.0001f)
        assertEquals(1f, angle.endPoint.x, 0.0001f)
        assertEquals(0.5f, angle.endPoint.y, 0.0001f)
    }

    @Test
    fun expandsDoublePositionStopsAndClampsNonDecreasingStops() {
        val expanded = JSGradientParser.parse("linear-gradient(to right, red 10% 30%, blue 100%)")
        val clamped = JSGradientParser.parse("linear-gradient(to right, red 70%, green 30%, blue 100%)")

        assertTrue(expanded is BackgroundImageValue.LinearGradient)
        expanded as BackgroundImageValue.LinearGradient
        assertEquals(3, expanded.stops.size)
        assertEquals(0.1f, expanded.stops[0].location, 0.0001f)
        assertEquals(0.3f, expanded.stops[1].location, 0.0001f)
        assertEquals(1f, expanded.stops[2].location, 0.0001f)

        assertTrue(clamped is BackgroundImageValue.LinearGradient)
        clamped as BackgroundImageValue.LinearGradient
        assertEquals(0.7f, clamped.stops[0].location, 0.0001f)
        assertEquals(0.7f, clamped.stops[1].location, 0.0001f)
        assertEquals(1f, clamped.stops[2].location, 0.0001f)
    }

    @Test
    fun parsesRadialAndConicPreludes() {
        val radial = JSGradientParser.parse("radial-gradient(circle closest-side at top right, red 0%, blue 100%)")
        val conic = JSGradientParser.parse("conic-gradient(from 0.25turn at left bottom, red 0%, blue 100%)")

        assertTrue(radial is BackgroundImageValue.RadialGradient)
        radial as BackgroundImageValue.RadialGradient
        assertEquals(RadialGradientShape.CIRCLE, radial.shape)
        assertEquals(RadialGradientExtent.CLOSEST_SIDE, radial.extent)
        assertEquals(1f, radial.center.x, 0.0001f)
        assertEquals(0f, radial.center.y, 0.0001f)

        assertTrue(conic is BackgroundImageValue.ConicGradient)
        conic as BackgroundImageValue.ConicGradient
        assertEquals(90f, conic.angleDegrees, 0.0001f)
        assertEquals(0f, conic.center.x, 0.0001f)
        assertEquals(1f, conic.center.y, 0.0001f)
    }

    @Test
    fun rejectsMalformedGradients() {
        assertNull(JSGradientParser.parse("linear-gradient(to right, rgba(255,0,0,0.8)garbage 0%, blue 100%)"))
        assertNull(JSGradientParser.parse("linear-gradient(to right, rgba(255,0,0,0.8 0%, blue 100%)"))
        assertNull(JSGradientParser.parse("linear-gradient(to right, red badstop, blue 100%)"))
        assertNull(JSGradientParser.parse("repeating-linear-gradient(to right, red, blue)"))
        assertNull(JSGradientParser.parse("repeating-radial-gradient(circle, red, blue)"))
        assertNull(JSGradientParser.parse("repeating-conic-gradient(from 45deg, red, blue)"))
        assertNull(JSGradientParser.parse("radial-gradient(circle foo at center, red, blue)"))
    }

    @Test
    fun parsesValidGradient() {
        assertNotNull(JSGradientParser.parse("linear-gradient(red, blue)"))
    }
}
