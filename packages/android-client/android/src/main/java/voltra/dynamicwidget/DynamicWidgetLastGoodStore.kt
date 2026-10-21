package voltra.dynamicwidget

import android.content.Context
import android.util.AtomicFile
import android.util.Log
import androidx.annotation.VisibleForTesting
import java.io.File
import java.io.IOException
import java.net.URLEncoder
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap

/**
 * The last render of each placement that succeeded, kept so a release widget whose `render()` later
 * throws keeps showing real content instead of the build-time placeholder (ADR 0013, section 5).
 *
 * One file per placement, keyed by `(widgetId, appWidgetId)`, under `noBackupFilesDir`: the content
 * belongs to a placement on this device, so it must not be restored from a cloud backup onto
 * another one. The value is the resolved node JSON `render()` returned, exactly what the next
 * render would have parsed.
 *
 * Writes go through [AtomicFile], and are skipped when a placement's output equals its last write
 * (compared by an in-memory hash), because recompositions mostly produce the same tree. A node over
 * [MAX_NODE_BYTES] is not stored and leaves the older one in place.
 *
 * Every mutation holds one process-wide lock, so the in-memory hashes and the files never disagree
 * and a restore cannot interleave with a write. A render that finishes after a clear can still
 * store its node; the update the clear triggers overwrites it.
 *
 * Failures are logged and swallowed: this is a cache, and a widget must never fail to draw because
 * it could not be written.
 */
internal class DynamicWidgetLastGoodStore(
    private val directory: File,
) {
    constructor(context: Context) : this(File(context.applicationContext.noBackupFilesDir, DIRECTORY_NAME))

    /** @return true when the file was written, false when skipped (unchanged, too large or failed). */
    fun write(
        widgetId: String,
        appWidgetId: Int,
        nodeJson: String,
    ): Boolean = synchronized(lock) { writeLocked(widgetId, appWidgetId, nodeJson) }

    private fun writeLocked(
        widgetId: String,
        appWidgetId: Int,
        nodeJson: String,
    ): Boolean {
        val bytes = nodeJson.toByteArray(Charsets.UTF_8)
        if (bytes.size > MAX_NODE_BYTES) {
            Log.w(TAG, "Not storing the last good render of '$widgetId' ($appWidgetId): ${bytes.size} bytes")
            return false
        }

        val file = fileFor(widgetId, appWidgetId)
        val hash = sha256(bytes)
        if (lastWrittenHashes[file.path] == hash) return false

        return try {
            directory.mkdirs()
            val atomicFile = AtomicFile(file)
            val stream = atomicFile.startWrite()
            try {
                stream.write(bytes)
                atomicFile.finishWrite(stream)
            } catch (e: IOException) {
                atomicFile.failWrite(stream)
                throw e
            }
            lastWrittenHashes[file.path] = hash
            true
        } catch (e: IOException) {
            Log.w(TAG, "Could not store the last good render of '$widgetId' ($appWidgetId): ${e.message}")
            false
        }
    }

    fun read(
        widgetId: String,
        appWidgetId: Int,
    ): String? {
        val file = fileFor(widgetId, appWidgetId)
        if (!file.exists()) return null

        return try {
            String(AtomicFile(file).readFully(), Charsets.UTF_8)
        } catch (e: IOException) {
            Log.w(TAG, "Could not read the last good render of '$widgetId' ($appWidgetId): ${e.message}")
            null
        }
    }

    /** A placement was removed from the home screen. */
    fun delete(
        widgetId: String,
        appWidgetIds: Collection<Int>,
    ) {
        synchronized(lock) {
            appWidgetIds.forEach { delete(fileFor(widgetId, it)) }
        }
    }

    /**
     * The launcher restored its layout and gave each placement a new id: carry the file over.
     *
     * Old and new ids can overlap (1 to 2 while 2 goes to 3), so every file is first moved aside and
     * only then to its final name; moving them one at a time would overwrite a file that has not
     * been moved yet.
     */
    fun remap(
        widgetId: String,
        oldAppWidgetIds: List<Int>,
        newAppWidgetIds: List<Int>,
    ) {
        synchronized(lock) {
            val moving =
                oldAppWidgetIds.zip(newAppWidgetIds).mapNotNull { (old, new) ->
                    val source = fileFor(widgetId, old)
                    if (!source.exists()) return@mapNotNull null

                    val aside = File(directory, "${source.name}$MOVING_SUFFIX")
                    if (!source.renameTo(aside)) {
                        Log.w(TAG, "Could not move the last good render of '$widgetId' ($old -> $new)")
                        return@mapNotNull null
                    }
                    // The bytes are no longer under the old name, and will be under another one.
                    lastWrittenHashes.remove(source.path)
                    Pair(aside, fileFor(widgetId, new))
                }

            moving.forEach { (aside, target) ->
                lastWrittenHashes.remove(target.path)
                target.delete()
                if (!aside.renameTo(target)) {
                    Log.w(TAG, "Could not move the last good render to ${target.name}")
                    aside.delete()
                }
            }
        }
    }

    /** The app cleared this widget's content, so a later failure must not bring it back. */
    fun clear(widgetId: String) {
        synchronized(lock) {
            val prefix = widgetPrefix(widgetId)
            directory
                .listFiles { file -> file.name.startsWith(prefix) }
                ?.forEach { delete(it) }
        }
    }

    fun clearAll() {
        synchronized(lock) {
            directory.listFiles()?.forEach { delete(it) }
        }
    }

    @VisibleForTesting
    fun storedAppWidgetIds(widgetId: String): Set<Int> {
        val prefix = widgetPrefix(widgetId)

        return directory
            .listFiles { file -> file.name.startsWith(prefix) && file.name.endsWith(SUFFIX) }
            ?.mapNotNull {
                it.name
                    .removePrefix(prefix)
                    .removeSuffix(SUFFIX)
                    .toIntOrNull()
            }?.toSet()
            .orEmpty()
    }

    private fun delete(file: File) {
        // AtomicFile keeps a `.new` sibling only mid-write; delete() clears both.
        AtomicFile(file).delete()
        lastWrittenHashes.remove(file.path)
    }

    private fun fileFor(
        widgetId: String,
        appWidgetId: Int,
    ): File = File(directory, "${widgetPrefix(widgetId)}$appWidgetId$SUFFIX")

    // `@` is percent-encoded by URLEncoder, so it cannot occur inside an encoded widget id and the
    // prefix of one widget id is never the prefix of another's.
    private fun widgetPrefix(widgetId: String): String = URLEncoder.encode(widgetId, "UTF-8") + "@"

    companion object {
        const val MAX_NODE_BYTES = 256 * 1024

        private const val TAG = "VoltraDynamicWidget"
        private const val DIRECTORY_NAME = "voltra_dynamic_widget_last_good"
        private const val SUFFIX = ".json"
        private const val MOVING_SUFFIX = ".moving"

        private val lock = Any()

        // Process-wide: every store instance over the same directory sees the same writes.
        private val lastWrittenHashes = ConcurrentHashMap<String, String>()

        private fun sha256(bytes: ByteArray): String =
            MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    }
}
