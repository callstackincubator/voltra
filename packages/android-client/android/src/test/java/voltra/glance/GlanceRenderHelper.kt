package voltra.glance

import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.ColorDrawable
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.RemoteViews
import android.widget.TextView
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.ExperimentalGlanceRemoteViewsApi
import androidx.glance.appwidget.GlanceRemoteViews
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import org.robolectric.RuntimeEnvironment
import voltra.models.VoltraNode
import voltra.parsing.VoltraDecompressor

/**
 * Composes Glance content into `RemoteViews` the way a widget update does, applies them into a real
 * `View` tree under a chosen color scheme, and reads what a user would see on the Views. No JavaScript
 * runs: the node is built by hand or decoded from compressed JSON, exactly as the on-device renderer
 * emits it.
 *
 * Run under Robolectric. Use `@Config(sdk = [31])` for the path where the launcher receives both
 * colors of a pair and `[26]` for the path where composition bakes one side in; add
 * `@GraphicsMode(GraphicsMode.Mode.NATIVE)` when reading bitmap pixels, and clear the arc bitmap
 * cache between schemes.
 *
 * ```
 * val views = GlanceRenderHelper.compose(GlanceRenderHelper.node(json), Scheme.DAY)
 * val day = views.applyUnder(Scheme.DAY)
 * val night = views.applyUnder(Scheme.NIGHT)  // same composition, other scheme
 * day.backgroundColors()  /  day.textColors()["Hi"]
 * ```
 */
@OptIn(ExperimentalGlanceRemoteViewsApi::class)
object GlanceRenderHelper {
    enum class Scheme { DAY, NIGHT }

    val DEFAULT_SIZE = DpSize(200.dp, 200.dp)

    private val json =
        Json {
            ignoreUnknownKeys = true
            explicitNulls = false
        }

    fun context(scheme: Scheme): Context {
        val app = RuntimeEnvironment.getApplication()
        val night =
            when (scheme) {
                Scheme.DAY -> Configuration.UI_MODE_NIGHT_NO
                Scheme.NIGHT -> Configuration.UI_MODE_NIGHT_YES
            }
        val configuration =
            Configuration(app.resources.configuration).apply {
                uiMode = (uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or night
            }
        return app.createConfigurationContext(configuration)
    }

    fun node(compressedJson: String): VoltraNode =
        VoltraDecompressor.decompressNode(json.decodeFromString<VoltraNode>(compressedJson))

    fun compose(
        node: VoltraNode,
        scheme: Scheme,
        size: DpSize = DEFAULT_SIZE,
    ): RemoteViews =
        runBlocking {
            GlanceRemoteViews()
                .compose(context(scheme), size) { GlanceFactory("test", widgetSize = size).Render(node) }
                .remoteViews
        }

    fun render(
        compressedJson: String,
        composeUnder: Scheme,
        applyUnder: Scheme = composeUnder,
    ): View = compose(node(compressedJson), composeUnder).applyUnder(applyUnder)
}

/** Inflates these `RemoteViews` into a `FrameLayout` with [scheme]'s configuration, as a launcher would. */
fun RemoteViews.applyUnder(scheme: GlanceRenderHelper.Scheme): View {
    val context = GlanceRenderHelper.context(scheme)
    val parent = FrameLayout(context)
    return apply(context, parent).also { parent.addView(it) }
}

fun View.descendants(): Sequence<View> =
    sequence {
        yield(this@descendants)
        if (this@descendants is ViewGroup) {
            for (index in 0 until childCount) yieldAll(getChildAt(index).descendants())
        }
    }

fun View.backgroundColors(): List<Int> = descendants().mapNotNull { (it.background as? ColorDrawable)?.color }.toList()

fun View.textColors(): Map<String, Int> =
    descendants().filterIsInstance<TextView>().associate { it.text.toString() to it.currentTextColor }

/** Bitmaps shown by `ImageView`s in the tree, depth first. Pixels need `@GraphicsMode(NATIVE)`. */
fun View.imageBitmaps(): List<Bitmap> =
    descendants()
        .filterIsInstance<ImageView>()
        .mapNotNull { (it.drawable as? BitmapDrawable)?.bitmap }
        .toList()
