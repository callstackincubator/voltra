package voltra.images

import android.graphics.BitmapFactory
import android.net.Uri
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class VoltraImageManagerTest {
    @Test
    fun preloadsInlineSvgAsPng() =
        runBlocking {
            val context = RuntimeEnvironment.getApplication()
            val manager = VoltraImageManager(context)

            val key =
                manager.preloadSvgImage(
                    key = "svg_icon",
                    svg =
                        """
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" fill="#ff0000"/>
                        </svg>
                        """.trimIndent(),
                    width = 24,
                    height = 24,
                )

            assertEquals("svg_icon", key)
            val uri = manager.getUriForKey("svg_icon")
            assertNotNull(uri)

            val bitmap =
                context.contentResolver.openInputStream(Uri.parse(uri)).use { stream ->
                    BitmapFactory.decodeStream(stream)
                }

            assertNotNull(bitmap)
            assertEquals(24, bitmap.width)
            assertEquals(24, bitmap.height)
        }
}
