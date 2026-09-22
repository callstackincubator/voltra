package voltra.ongoingnotification

import android.content.Context
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Icon
import android.net.Uri
import android.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.GraphicsMode
import voltra.ongoingnotification.VoltraNotificationImageResolver.Companion.MAX_ICON_LONG_EDGE_PX
import voltra.ongoingnotification.VoltraNotificationImageResolver.Companion.MAX_PICTURE_LONG_EDGE_PX
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class VoltraNotificationImageResolverTest {
    private val context: Context
        get() = RuntimeEnvironment.getApplication()

    private val resolver by lazy { VoltraNotificationImageResolver(context) }

    @Test
    fun `keeps the subsampling factor within one doubling of the cap`() {
        assertEquals(2, computeInSampleSize(3000, 2000, MAX_PICTURE_LONG_EDGE_PX))
        assertEquals(8, computeInSampleSize(3000, 2000, MAX_ICON_LONG_EDGE_PX))
        assertEquals(1, computeInSampleSize(800, 600, MAX_PICTURE_LONG_EDGE_PX))
        assertEquals(1, computeInSampleSize(0, 0, MAX_PICTURE_LONG_EDGE_PX))
    }

    @Test
    fun `caps the long edge without distorting the aspect ratio`() {
        assertEquals(1024 to 683, targetSize(3000, 2000, MAX_PICTURE_LONG_EDGE_PX))
        assertEquals(256 to 171, targetSize(3000, 2000, MAX_ICON_LONG_EDGE_PX))
        assertEquals(800 to 600, targetSize(800, 600, MAX_PICTURE_LONG_EDGE_PX))
        assertEquals(1024 to 1, targetSize(3000, 1, MAX_PICTURE_LONG_EDGE_PX))
    }

    @Test
    fun `downscales an inline picture to the picture budget`() {
        val bitmap = resolver.resolveIcon(inlineSource(pngBase64(3000, 2000)), MAX_PICTURE_LONG_EDGE_PX)?.bitmapOrNull()

        assertNotNull(bitmap)
        assertEquals(MAX_PICTURE_LONG_EDGE_PX, maxOf(bitmap!!.width, bitmap.height))
        assertEquals(1.5f, bitmap.width.toFloat() / bitmap.height, 0.02f)
    }

    @Test
    fun `leaves an inline picture that already fits alone`() {
        val bitmap = resolver.resolveIcon(inlineSource(pngBase64(800, 600)), MAX_PICTURE_LONG_EDGE_PX)?.bitmapOrNull()

        assertEquals(800, bitmap?.width)
        assertEquals(600, bitmap?.height)
    }

    @Test
    fun `downscales a preloaded picture to the picture budget`() {
        registerPreloaded("route_snapshot", pngBytes(3000, 2000))

        val bitmap =
            resolver
                .resolveIcon(
                    AndroidOngoingNotificationImageSource(assetName = "route_snapshot"),
                    MAX_PICTURE_LONG_EDGE_PX,
                )?.bitmapOrNull()

        assertEquals(MAX_PICTURE_LONG_EDGE_PX, maxOf(bitmap!!.width, bitmap.height))
    }

    @Test
    fun `caps a thumbnail at the icon budget`() {
        val bitmap = resolver.resolveIcon(inlineSource(pngBase64(2000, 2000)), MAX_ICON_LONG_EDGE_PX)?.bitmapOrNull()

        assertEquals(MAX_ICON_LONG_EDGE_PX, maxOf(bitmap!!.width, bitmap.height))
    }

    @Test
    fun `hands a bundled drawable to the framework instead of decoding it`() {
        val icon =
            resolver.resolveIcon(
                AndroidOngoingNotificationImageSource(assetName = TEST_DRAWABLE),
                MAX_PICTURE_LONG_EDGE_PX,
            )

        assertEquals(Icon.TYPE_RESOURCE, icon?.type)
    }

    @Test
    fun `renders a bundled drawable when the platform only takes a bitmap`() {
        val bitmap =
            resolver.resolveBitmap(
                AndroidOngoingNotificationImageSource(assetName = TEST_DRAWABLE),
                MAX_PICTURE_LONG_EDGE_PX,
            )

        assertNotNull(bitmap)
        assertTrue(bitmap!!.width > 0)
        assertEquals(bitmap.width, bitmap.height)
    }

    @Test
    fun `subsamples a bundled bitmap resource while decoding it`() {
        val bitmap =
            resolver.resolveBitmap(
                AndroidOngoingNotificationImageSource(assetName = TEST_PHOTO),
                MAX_PICTURE_LONG_EDGE_PX,
            )

        assertNotNull(bitmap)
        assertEquals(MAX_PICTURE_LONG_EDGE_PX, maxOf(bitmap!!.width, bitmap.height))
        assertEquals(1.5f, bitmap.width.toFloat() / bitmap.height, 0.02f)
    }

    @Test
    fun `gives up quietly on artwork it cannot decode`() {
        val unparsable =
            AndroidOngoingNotificationImageSource(
                base64 = Base64.encodeToString("not an image".toByteArray(), Base64.NO_WRAP),
            )

        assertNull(resolver.resolveIcon(unparsable, MAX_PICTURE_LONG_EDGE_PX))
        assertNull(resolver.resolveBitmap(unparsable, MAX_PICTURE_LONG_EDGE_PX))
        assertNull(
            resolver.resolveIcon(
                AndroidOngoingNotificationImageSource(assetName = "no_such_asset"),
                MAX_ICON_LONG_EDGE_PX,
            ),
        )
        assertNull(resolver.resolveIcon(null, MAX_ICON_LONG_EDGE_PX))
    }

    private fun inlineSource(base64: String) = AndroidOngoingNotificationImageSource(base64 = base64)

    private fun Icon.bitmapOrNull(): Bitmap? = (loadDrawable(context) as? BitmapDrawable)?.bitmap

    private fun pngBase64(
        width: Int,
        height: Int,
    ): String = Base64.encodeToString(pngBytes(width, height), Base64.NO_WRAP)

    /**
     * Leaves an image behind the way the preload API does: a URI reachable under the asset name. The
     * store's own FileProvider caches one directory for the lifetime of a JVM, which Robolectric
     * replaces per test, so these tests answer the content resolver directly instead.
     */
    private fun registerPreloaded(
        key: String,
        bytes: ByteArray,
    ) {
        val uri = Uri.parse("content://$PRELOAD_AUTHORITY/$key")
        shadowOf(context.contentResolver).registerInputStream(uri, ByteArrayInputStream(bytes))
        context
            .getSharedPreferences(PRELOAD_PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(key, uri.toString())
            .apply()
    }

    private companion object {
        const val TEST_DRAWABLE = "voltra_test_picture"

        /** A 3000x2000 bitmap resource, big enough that the decoder has to subsample it. */
        const val TEST_PHOTO = "voltra_test_photo"

        // The preferences and authority VoltraImageStore registers preloaded images under.
        const val PRELOAD_PREFS = "voltra_preload_images"
        const val PRELOAD_AUTHORITY = "voltra.test.preloads"

        /**
         * Encoded through the platform PNG encoder, so the decoder under test is the only thing
         * deciding the dimensions of what comes back out.
         */
        fun pngBytes(
            width: Int,
            height: Int,
        ): ByteArray {
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val output = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
            bitmap.recycle()
            return output.toByteArray()
        }
    }
}
