package voltra

import android.os.Build
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class VoltraRNTest {
    @Test
    fun `does not use AppWidgetHostView below API 32`() {
        assertFalse(usesAppWidgetHostView(Build.VERSION_CODES.S))
        assertFalse(usesAppWidgetHostView(Build.VERSION_CODES.R))
        assertFalse(usesAppWidgetHostView(24))
    }

    @Test
    fun `uses AppWidgetHostView from API 32 onward`() {
        assertTrue(usesAppWidgetHostView(Build.VERSION_CODES.S_V2))
        assertTrue(usesAppWidgetHostView(Build.VERSION_CODES.S_V2 + 1))
    }

    @Test
    fun `is complementary with the lazy renderers' eager-fallback gate`() {
        // VoltraLazyColumn/VoltraLazyVerticalGrid fall back to eager rendering for
        // `sdkInt <= Build.VERSION_CODES.S` (API 31). usesAppWidgetHostView must cover exactly
        // the rest, with no gap and no overlap, or some API level would get neither path.
        for (sdkInt in 21..40) {
            val fallsBackToEagerRendering = sdkInt <= Build.VERSION_CODES.S
            assertTrue(fallsBackToEagerRendering != usesAppWidgetHostView(sdkInt))
        }
    }
}
