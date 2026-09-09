package voltra.glance.renderers.arc

import android.graphics.Bitmap
import android.util.LruCache

/**
 * Byte-bounded cache of rendered arc bitmaps, keyed by the [ArcSpec] that produced them.
 *
 * Equal specs return the same [Bitmap] instance. That identity is what lets
 * `RemoteViews.BitmapCache` deduplicate the image across the size variants of a responsive
 * widget, so one gauge costs its bytes once per widget rather than once per variant.
 */
object ArcBitmapCache {
    // A responsive widget composes up to six size variants per update. A fill-sized arc resolves
    // to a different pixel size in each of them, so the bound holds a full set of arcs at the
    // 512 px cap (1 MiB each) without the update evicting its own entries.
    private const val MAX_BYTES = 8 * 1024 * 1024

    private val cache =
        object : LruCache<ArcSpec, Bitmap>(MAX_BYTES) {
            override fun sizeOf(
                key: ArcSpec,
                value: Bitmap,
            ): Int = value.allocationByteCount
        }

    /** Returns the cached bitmap for [spec], rendering and storing one when absent. */
    @Synchronized
    fun get(spec: ArcSpec): Bitmap {
        cache.get(spec)?.let { return it }

        val bitmap = renderArcBitmap(spec)
        cache.put(spec, bitmap)
        return bitmap
    }

    /** Drops every cached bitmap. */
    @Synchronized
    fun clear() {
        cache.evictAll()
    }
}
