package voltra.glance.renderers.arc

import android.graphics.Paint
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertSame
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.GraphicsMode
import android.graphics.Color as AndroidColor

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ArcBitmapCacheTest {
    private val baseSpec =
        ArcSpec(
            sizePx = 64,
            progress = 0.75f,
            startAngle = 135f,
            sweepAngle = 270f,
            strokePx = 8f,
            cap = Paint.Cap.ROUND,
            colorArgb = AndroidColor.RED,
            trackColorArgb = AndroidColor.BLUE,
        )

    @Before
    fun resetCache() {
        ArcBitmapCache.clear()
    }

    @Test
    fun returnsTheSameBitmapInstanceForEqualSpecs() {
        val first = ArcBitmapCache.get(baseSpec)
        val second = ArcBitmapCache.get(baseSpec.copy())

        assertSame(first, second)
    }

    @Test
    fun rendersAFreshBitmapWhenAPropChanges() {
        val first = ArcBitmapCache.get(baseSpec)

        assertNotSame(first, ArcBitmapCache.get(baseSpec.copy(progress = 0.25f)))
        assertNotSame(first, ArcBitmapCache.get(baseSpec.copy(colorArgb = AndroidColor.GREEN)))
        assertNotSame(first, ArcBitmapCache.get(baseSpec.copy(cap = Paint.Cap.BUTT)))
        // The responsive-variant argument turns on this one: a fill-sized arc resolves to a
        // different pixel size per variant and must not reuse another variant's bitmap.
        assertNotSame(first, ArcBitmapCache.get(baseSpec.copy(sizePx = 128)))
        assertNotSame(first, ArcBitmapCache.get(baseSpec.copy(trackColorArgb = AndroidColor.GREEN)))
        assertNotSame(first, ArcBitmapCache.get(baseSpec.copy(startAngle = 0f)))
        assertNotSame(first, ArcBitmapCache.get(baseSpec.copy(sweepAngle = 360f)))
        assertNotSame(first, ArcBitmapCache.get(baseSpec.copy(strokePx = 4f)))
        assertNotSame(
            first,
            ArcBitmapCache.get(baseSpec.copy(gradientColorsArgb = listOf(AndroidColor.RED, AndroidColor.BLUE))),
        )
    }

    @Test
    fun rendersAgainAfterTheCacheIsCleared() {
        val first = ArcBitmapCache.get(baseSpec)
        ArcBitmapCache.clear()

        assertNotSame(first, ArcBitmapCache.get(baseSpec))
    }
}
