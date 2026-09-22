package voltra

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Icon
import android.net.Uri
import android.util.Base64
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

/**
 * Covers what Voltra hands the framework, through the real [Notification.Builder] and a shadowed
 * notification manager: which style, which flags, and which of the framework's own extras end up
 * filled. Artwork is asserted at sizes below what the platform clamps a notification to, so a wrong
 * size here is Voltra's doing. The downscale caps are asserted on the resolver, which is the code
 * that applies them.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class VoltraNotificationManagerOngoingStyleTest {
    private val context: Context
        get() = RuntimeEnvironment.getApplication()

    private val notificationManager: NotificationManager
        get() = context.getSystemService(NotificationManager::class.java)

    @Before
    fun createNotificationChannel() {
        notificationManager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Ongoing", NotificationManager.IMPORTANCE_DEFAULT),
        )
    }

    @Test
    fun `posts a big picture as an ongoing BigPictureStyle notification`() {
        val posted = post(bigPicturePayload(pictureField(SMALL_PICTURE), "\"summaryText\":\"Order 123\""))

        assertEquals(TEMPLATE_BIG_PICTURE, posted.extras.getString(Notification.EXTRA_TEMPLATE))
        assertTrue(posted.flags and Notification.FLAG_ONGOING_EVENT != 0)
        assertNull(posted.category)
        assertEquals("Parcel delivered", posted.extras.getCharSequence(Notification.EXTRA_TITLE).toString())
        assertEquals("Left at the front door", posted.extras.getCharSequence(Notification.EXTRA_TEXT).toString())
        assertEquals("Order 123", posted.extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT).toString())
    }

    @Test
    fun `keeps the big text template out of a big picture notification`() {
        val posted = post(bigPicturePayload(pictureField(SMALL_PICTURE)))

        assertFalse(TEMPLATE_BIG_TEXT == posted.extras.getString(Notification.EXTRA_TEMPLATE))
        assertNull(posted.extras.getCharSequence(Notification.EXTRA_BIG_TEXT))
    }

    @Test
    fun `posts a bundled drawable as a resource icon`() {
        val posted = post(bigPicturePayload(assetPictureField()))

        val pictureIcon = posted.extras.getParcelable(Notification.EXTRA_PICTURE_ICON) as? Icon

        assertEquals(Icon.TYPE_RESOURCE, pictureIcon?.type)
    }

    @Test
    @Config(sdk = [30])
    fun `renders a bundled drawable into the picture below API 31`() {
        val posted = post(bigPicturePayload(assetPictureField()))

        assertNotNull(posted.extras.getParcelable(Notification.EXTRA_PICTURE) as? Bitmap)
        assertNull(posted.extras.getParcelable(Notification.EXTRA_PICTURE_ICON) as? Icon)
    }

    @Test
    fun `posts an inline picture as a bitmap`() {
        val posted = post(bigPicturePayload(pictureField(SMALL_PICTURE)))

        val picture = posted.extras.getParcelable(Notification.EXTRA_PICTURE) as? Bitmap

        assertNotNull(picture)
        assertEquals(200, picture!!.width)
        assertEquals(150, picture.height)
        assertNull(posted.extras.getParcelable(Notification.EXTRA_PICTURE_ICON) as? Icon)
    }

    @Test
    fun `posts a preloaded picture as a bitmap`() {
        registerPreloaded("route_snapshot", pngBytes(200, 150))

        val posted = post(bigPicturePayload(""" "picture":{"assetName":"route_snapshot"} """))

        val picture = posted.extras.getParcelable(Notification.EXTRA_PICTURE) as? Bitmap

        assertEquals(200, picture!!.width)
        assertEquals(150, picture.height)
    }

    @Test
    fun `posts a thumbnail below the platform limit unchanged`() {
        val posted = post(bigPicturePayload(pictureField(SMALL_PICTURE), inlineField("largeIcon", 40, 40)))

        val largeIcon = posted.bitmapFromExtra(Notification.EXTRA_LARGE_ICON)

        assertNotNull(largeIcon)
        assertEquals(40, largeIcon!!.width)
        assertEquals(40, largeIcon.height)
    }

    @Test
    fun `posts a thumbnail for a progress notification`() {
        val posted = post(progressPayload(inlineField("largeIcon", 40, 40)))

        assertEquals(40, posted.bitmapFromExtra(Notification.EXTRA_LARGE_ICON)?.width)
    }

    @Test
    fun `clears the expanded thumbnail while keeping the collapsed one`() {
        val posted =
            post(
                bigPicturePayload(
                    pictureField(SMALL_PICTURE),
                    inlineField("largeIcon", 40, 40),
                    "\"hideLargeIconWhenExpanded\":true",
                ),
            )

        assertTrue(posted.extras.containsKey(Notification.EXTRA_LARGE_ICON_BIG))
        assertNull(posted.extras.getParcelable(Notification.EXTRA_LARGE_ICON_BIG) as? Icon)
        assertNotNull(posted.bitmapFromExtra(Notification.EXTRA_LARGE_ICON))
    }

    @Test
    fun `prefers an expanded thumbnail over hiding it`() {
        val posted =
            post(
                bigPicturePayload(
                    pictureField(SMALL_PICTURE),
                    inlineField("largeIcon", 40, 40),
                    "\"hideLargeIconWhenExpanded\":true",
                    inlineField("bigLargeIcon", 32, 32),
                ),
            )

        val bigLargeIcon = posted.bitmapFromExtra(Notification.EXTRA_LARGE_ICON_BIG)

        assertNotNull(bigLargeIcon)
        assertEquals(32, bigLargeIcon!!.width)
    }

    @Test
    fun `leaves the expanded thumbnail alone when neither option is given`() {
        val posted = post(bigPicturePayload(pictureField(SMALL_PICTURE)))

        assertFalse(posted.extras.containsKey(Notification.EXTRA_LARGE_ICON_BIG))
    }

    @Test
    @Config(sdk = [31])
    fun `asks to show the picture while collapsed on API 31 and above`() {
        val posted = post(bigPicturePayload(pictureField(SMALL_PICTURE), "\"showPictureWhenCollapsed\":true"))

        assertTrue(posted.extras.getBoolean(Notification.EXTRA_SHOW_BIG_PICTURE_WHEN_COLLAPSED))
        assertEquals(
            "Photo of the parcel",
            posted.extras.getCharSequence(Notification.EXTRA_PICTURE_CONTENT_DESCRIPTION).toString(),
        )
    }

    @Test
    @Config(sdk = [30])
    fun `posts a big picture without the newer picture options below API 31`() {
        val posted = post(bigPicturePayload(pictureField(SMALL_PICTURE), "\"showPictureWhenCollapsed\":true"))

        assertEquals(TEMPLATE_BIG_PICTURE, posted.extras.getString(Notification.EXTRA_TEMPLATE))
        assertFalse(posted.extras.getBoolean(Notification.EXTRA_SHOW_BIG_PICTURE_WHEN_COLLAPSED))
        assertNull(posted.extras.getCharSequence(Notification.EXTRA_PICTURE_CONTENT_DESCRIPTION))
        assertNotNull(posted.extras.getParcelable(Notification.EXTRA_PICTURE) as? Bitmap)
    }

    @Test
    fun `posts without a big picture when the picture cannot be decoded`() {
        val unparsable = Base64.encodeToString("not an image".toByteArray(), Base64.NO_WRAP)
        val posted = post(bigPicturePayload(""" "picture":{"base64":"$unparsable"} """))

        assertEquals(TEMPLATE_BIG_PICTURE, posted.extras.getString(Notification.EXTRA_TEMPLATE))
        assertNull(posted.extras.getParcelable(Notification.EXTRA_PICTURE) as? Bitmap)
        assertNull(posted.extras.getParcelable(Notification.EXTRA_PICTURE_ICON) as? Icon)
    }

    @Test
    fun `posts inbox lines in order`() {
        val posted =
            post(
                inboxPayload(
                    "\"title\":\"3 stops remaining\"",
                    "\"text\":\"Next: 12 Oak Street\"",
                    "\"lines\":[\"12 Oak Street\",\"4 Elm Road\",\"Depot\"]",
                    "\"summaryText\":\"Route 7\"",
                ),
            )

        assertEquals(TEMPLATE_INBOX, posted.extras.getString(Notification.EXTRA_TEMPLATE))
        assertTrue(posted.flags and Notification.FLAG_ONGOING_EVENT != 0)
        assertNull(posted.category)
        assertEquals("Next: 12 Oak Street", posted.extras.getCharSequence(Notification.EXTRA_TEXT).toString())
        assertEquals("Route 7", posted.extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT).toString())
        assertEquals(listOf("12 Oak Street", "4 Elm Road", "Depot"), posted.postedLines())
    }

    @Test
    fun `posts the first six lines of a hand-written payload that carries more`() {
        val posted = post(inboxPayload("\"lines\":[\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\"]"))

        assertEquals(listOf("1", "2", "3", "4", "5", "6"), posted.postedLines())
    }

    @Test
    fun `replaces the template when an update switches the payload kind`() {
        val manager = VoltraNotificationManager(context)
        val notificationId = "route-7"

        runBlocking {
            manager.startOngoingNotification(progressPayload(), options(notificationId))
            manager.updateOngoingNotification(
                notificationId,
                inboxPayload("\"title\":\"3 stops remaining\"", "\"lines\":[\"12 Oak Street\"]"),
                null,
            )
        }

        val posted = shadowOf(notificationManager).allNotifications.last()

        assertEquals(TEMPLATE_INBOX, posted.extras.getString(Notification.EXTRA_TEMPLATE))
        assertEquals(listOf("12 Oak Street"), posted.postedLines())
    }

    private fun options(notificationId: String) =
        AndroidOngoingNotificationOptions(
            notificationId = notificationId,
            channelId = CHANNEL_ID,
            deepLinkUrl = "voltra://orders/123",
        )

    private fun post(
        payload: String,
        notificationId: String = "delivery-123",
    ): Notification {
        val result =
            runBlocking {
                VoltraNotificationManager(
                    context,
                ).startOngoingNotification(payload, options(notificationId))
            }

        assertTrue("startOngoingNotification failed with ${result.reason}", result.ok)

        return shadowOf(notificationManager).allNotifications.last()
    }

    private fun bigPicturePayload(vararg extraFields: String): String =
        payload(
            "\"kind\":\"bigPicture\"",
            "\"title\":\"Parcel delivered\"",
            "\"text\":\"Left at the front door\"",
            "\"pictureContentDescription\":\"Photo of the parcel\"",
            *extraFields,
        )

    private fun progressPayload(vararg extraFields: String): String =
        payload(
            "\"kind\":\"progress\"",
            "\"title\":\"Uploading\"",
            "\"value\":2",
            "\"max\":10",
            *extraFields,
        )

    private fun inboxPayload(vararg extraFields: String): String =
        payload("\"kind\":\"inbox\"", "\"title\":\"Route\"", "\"text\":\"Start\"", *extraFields)

    private fun payload(vararg fields: String): String =
        (listOf("\"v\":1") + fields.toList()).joinToString(",", "{", "}")

    private fun assetPictureField(): String = """ "picture":{"assetName":"$TEST_DRAWABLE"} """

    private fun pictureField(size: Int): String = inlineField("picture", size, size * 3 / 4)

    private fun inlineField(
        name: String,
        width: Int,
        height: Int,
    ): String = """ "$name":{"base64":"${pngBase64(width, height)}"} """

    private fun pngBase64(
        width: Int,
        height: Int,
    ): String = Base64.encodeToString(pngBytes(width, height), Base64.NO_WRAP)

    private fun Notification.postedLines(): List<String> =
        extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.map { line -> line.toString() }.orEmpty()

    private fun Notification.bitmapFromExtra(key: String): Bitmap? =
        ((extras.getParcelable(key) as? Icon)?.loadDrawable(context) as? BitmapDrawable)?.bitmap

    /**
     * Leaves an image behind the way the preload API does: a URI reachable under the asset name. The
     * store's own FileProvider caches one directory for the lifetime of a JVM, which Robolectric
     * replaces per test, so these tests answer the content resolver directly instead. The resolver
     * opens a preloaded image twice, for its bounds and for its pixels, so every open has to be
     * handed a stream that has not been read.
     */
    private fun registerPreloaded(
        key: String,
        bytes: ByteArray,
    ) {
        val uri = Uri.parse("content://$PRELOAD_AUTHORITY/$key")
        shadowOf(context.contentResolver).registerInputStreamSupplier(uri) { ByteArrayInputStream(bytes) }
        context
            .getSharedPreferences(PRELOAD_PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(key, uri.toString())
            .apply()
    }

    private companion object {
        const val CHANNEL_ID = "ongoing_updates"
        const val TEST_DRAWABLE = "voltra_test_picture"
        const val TEMPLATE_BIG_PICTURE = "android.app.Notification\$BigPictureStyle"
        const val TEMPLATE_BIG_TEXT = "android.app.Notification\$BigTextStyle"
        const val TEMPLATE_INBOX = "android.app.Notification\$InboxStyle"
        const val PRELOAD_PREFS = "voltra_preload_images"
        const val PRELOAD_AUTHORITY = "voltra.test.preloads"

        /** Long edge small enough that the platform's own clamping leaves the bitmap alone. */
        const val SMALL_PICTURE = 200

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
