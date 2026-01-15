package voltra.glance.renderers

import androidx.glance.action.Action
import androidx.glance.appwidget.action.actionStartActivity
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.layout.ContentScale
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import voltra.ComponentRegistry
import voltra.glance.LocalVoltraRenderContext
import voltra.images.VoltraImageManager
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.styling.CompositeStyle

private val gson = Gson()
private const val TAG = "RenderCommon"

fun getOnClickAction(
    context: Context,
    props: Map<String, Any>?,
    widgetId: String,
    componentId: String,
): Action {
    val deepLinkUrl = props?.get("deepLinkUrl") as? String

    if (deepLinkUrl != null && deepLinkUrl.isNotEmpty()) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLinkUrl))
        intent.setPackage(context.packageName)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return actionStartActivity(intent)
    }

    // Fallback: Start main activity
    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
    if (launchIntent != null) {
        // Add extras so the app knows what was clicked
        launchIntent.putExtra("widgetId", widgetId)
        launchIntent.putExtra("componentId", componentId)
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return actionStartActivity(launchIntent)
    }

    return actionStartActivity(Intent())
}

fun parseContentScale(value: String?): ContentScale =
    when (value) {
        "crop", "cover" -> ContentScale.Crop
        "fit", "contain" -> ContentScale.Fit
        "fill-bounds", "stretch" -> ContentScale.FillBounds
        else -> ContentScale.Fit
    }

@Composable
fun extractImageProvider(sourceProp: Any?): ImageProvider? {
    if (sourceProp == null) return null

    val context = LocalContext.current
    val sourceMap =
        when (sourceProp) {
            is String -> {
                try {
                    val type = object : TypeToken<Map<String, Any>>() {}.type
                    gson.fromJson<Map<String, Any>>(sourceProp, type)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to parse image source JSON: $sourceProp", e)
                    null
                }
            }
            is Map<*, *> -> {
                @Suppress("UNCHECKED_CAST")
                sourceProp as? Map<String, Any>
            }
            else -> null
        } ?: return null

    val assetName = sourceMap["assetName"] as? String
    val base64 = sourceMap["base64"] as? String

    if (assetName != null) {
        // Try as drawable resource first
        val resId = context.resources.getIdentifier(assetName, "drawable", context.packageName)
        if (resId != 0) return ImageProvider(resId)

        // Try as preloaded asset
        val imageManager = VoltraImageManager(context)
        val uriString = imageManager.getUriForKey(assetName)
        if (uriString != null) {
            try {
                val uri = Uri.parse(uriString)
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    val bitmap = BitmapFactory.decodeStream(stream)
                    return ImageProvider(bitmap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to decode preloaded image: $assetName", e)
            }
        }
    }

    if (base64 != null) {
        try {
            val decodedString = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.size)
            if (bitmap != null) {
                return ImageProvider(bitmap)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decode base64 image", e)
        }
    }

    return null
}

/**
 * Main dispatcher for rendering any VoltraNode.
 * Handles Element, Array, Ref, Text, and null cases.
 * Children rendering is delegated to RenderNode - each component doesn't need to care about node types.
 */
@Composable
fun RenderNode(node: VoltraNode?) {
    val context = LocalVoltraRenderContext.current

    when (node) {
        is VoltraNode.Element -> RenderElement(node.element)
        is VoltraNode.Array -> {
            node.elements.forEach { RenderNode(it) }
        }
        is VoltraNode.Ref -> {
            val resolved = context.sharedElements?.getOrNull(node.ref)
            RenderNode(resolved)
        }
        is VoltraNode.Text -> androidx.glance.text.Text(node.text)
        null -> { /* Empty */ }
    }
}

/**
 * Router that dispatches to specific component renderers based on element type.
 */
@Composable
private fun RenderElement(element: VoltraElement) {
    when (element.t) {
        ComponentRegistry.TEXT -> RenderText(element)
        ComponentRegistry.COLUMN -> RenderColumn(element)
        ComponentRegistry.ROW -> RenderRow(element)
        ComponentRegistry.BOX -> RenderBox(element)
        ComponentRegistry.SPACER -> RenderSpacer(element)
        ComponentRegistry.IMAGE -> RenderImage(element)
        ComponentRegistry.BUTTON -> RenderButton(element)
        ComponentRegistry.LINEAR_PROGRESS -> RenderLinearProgress(element)
        ComponentRegistry.CIRCULAR_PROGRESS -> RenderCircularProgress(element)
        ComponentRegistry.SWITCH -> RenderSwitch(element)
        ComponentRegistry.RADIO_BUTTON -> RenderRadioButton(element)
        ComponentRegistry.CHECK_BOX -> RenderCheckBox(element)
        ComponentRegistry.FILLED_BUTTON -> RenderFilledButton(element)
        ComponentRegistry.OUTLINE_BUTTON -> RenderOutlineButton(element)
        ComponentRegistry.CIRCLE_ICON_BUTTON -> RenderCircleIconButton(element)
        ComponentRegistry.SQUARE_ICON_BUTTON -> RenderSquareIconButton(element)
        ComponentRegistry.TITLE_BAR -> RenderTitleBar(element)
        ComponentRegistry.SCAFFOLD -> RenderScaffold(element)
        ComponentRegistry.LAZY_COLUMN -> RenderLazyColumn(element)
        ComponentRegistry.LAZY_VERTICAL_GRID -> RenderLazyVerticalGrid(element)
    }
}

/**
 * Used when an element with a pre-computed modifier needs to be rendered.
 * This is used when we need to apply weight separately from other styles (in scopes).
 */
@Composable
fun RenderElementWithModifier(
    element: VoltraElement,
    modifier: GlanceModifier,
    compositeStyle: CompositeStyle?,
) {
    when (element.t) {
        ComponentRegistry.TEXT -> RenderText(element, modifier, compositeStyle)
        ComponentRegistry.COLUMN -> RenderColumn(element, modifier)
        ComponentRegistry.ROW -> RenderRow(element, modifier)
        ComponentRegistry.BOX -> RenderBox(element, modifier)
        ComponentRegistry.SPACER -> RenderSpacer(element, modifier)
        ComponentRegistry.IMAGE -> RenderImage(element, modifier)
        ComponentRegistry.BUTTON -> RenderButton(element, modifier)
        ComponentRegistry.LINEAR_PROGRESS -> RenderLinearProgress(element, modifier)
        ComponentRegistry.CIRCULAR_PROGRESS -> RenderCircularProgress(element, modifier)
        ComponentRegistry.SWITCH -> RenderSwitch(element, modifier)
        ComponentRegistry.RADIO_BUTTON -> RenderRadioButton(element, modifier)
        ComponentRegistry.CHECK_BOX -> RenderCheckBox(element, modifier)
        ComponentRegistry.FILLED_BUTTON -> RenderFilledButton(element, modifier)
        ComponentRegistry.OUTLINE_BUTTON -> RenderOutlineButton(element, modifier)
        ComponentRegistry.CIRCLE_ICON_BUTTON -> RenderCircleIconButton(element, modifier)
        ComponentRegistry.SQUARE_ICON_BUTTON -> RenderSquareIconButton(element, modifier)
        ComponentRegistry.TITLE_BAR -> RenderTitleBar(element, modifier)
        ComponentRegistry.SCAFFOLD -> RenderScaffold(element, modifier)
        ComponentRegistry.LAZY_COLUMN -> RenderLazyColumn(element, modifier)
        ComponentRegistry.LAZY_VERTICAL_GRID -> RenderLazyVerticalGrid(element, modifier)
    }
}
