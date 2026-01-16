package voltra.styling

import android.util.Log
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

object GlanceStyleConverter {
    
    private const val TAG = "GlanceStyleConverter"
    
    /**
     * Apply view styles to GlanceModifier.
     * The style parameter is the resolved style map (not props).
     */
    fun applyModifier(style: Map<String, Any>?): GlanceModifier {
        if (style == null) return GlanceModifier
        
        var modifier: GlanceModifier = GlanceModifier
        
        // Width (w or width)
        val width = (style["w"] as? Number) ?: (style["width"] as? Number)
        width?.let { 
            modifier = modifier.then(GlanceModifier.width(it.toFloat().dp))
        }
        
        // Height (h or height)
        val height = (style["h"] as? Number) ?: (style["height"] as? Number)
        height?.let { 
            modifier = modifier.then(GlanceModifier.height(it.toFloat().dp))
        }
        
        // Padding (pad or padding)
        val padding = (style["pad"] as? Number) ?: (style["padding"] as? Number)
        padding?.let { 
            modifier = modifier.then(GlanceModifier.padding(it.toFloat().dp))
        }
        
        // Individual padding
        val pt = ((style["pt"] as? Number) ?: (style["paddingTop"] as? Number))?.toFloat()?.dp
        val pb = ((style["pb"] as? Number) ?: (style["paddingBottom"] as? Number))?.toFloat()?.dp
        val pl = ((style["pl"] as? Number) ?: (style["paddingLeft"] as? Number))?.toFloat()?.dp
        val pr = ((style["pr"] as? Number) ?: (style["paddingRight"] as? Number))?.toFloat()?.dp
        
        if (pt != null || pb != null || pl != null || pr != null) {
            modifier = modifier.then(GlanceModifier.padding(
                start = pl ?: 0.dp,
                top = pt ?: 0.dp,
                end = pr ?: 0.dp,
                bottom = pb ?: 0.dp
            ))
        }
        
        // Background color (bg or backgroundColor)
        val bgColor = (style["bg"] as? String) ?: (style["backgroundColor"] as? String)
        bgColor?.let { colorString ->
            parseColor(colorString)?.let { color ->
                modifier = modifier.then(GlanceModifier.background(color))
            }
        }
        
        // Border radius (br or borderRadius) - only works on Android 12+/API 31+
        val borderRadius = ((style["br"] as? Number) ?: (style["borderRadius"] as? Number))?.toFloat()
        borderRadius?.let {
            modifier = modifier.then(GlanceModifier.cornerRadius(it.dp))
        }
        
        // Flex (fl or flex: 1 fills available space)
        val flex = ((style["fl"] as? Number) ?: (style["flex"] as? Number))?.toInt()
        if (flex == 1) {
            modifier = modifier.then(GlanceModifier.fillMaxWidth().fillMaxHeight())
        }
        
        // Fill max width/height individually (fmw/fmh or fillMaxWidth/fillMaxHeight)
        val fillWidth = (style["fmw"] as? Boolean) ?: (style["fillMaxWidth"] as? Boolean)
        if (fillWidth == true) {
            modifier = modifier.then(GlanceModifier.fillMaxWidth())
        }
        
        val fillHeight = (style["fmh"] as? Boolean) ?: (style["fillMaxHeight"] as? Boolean)
        if (fillHeight == true) {
            modifier = modifier.then(GlanceModifier.fillMaxHeight())
        }
        
        return modifier
    }
    
    /**
     * Build TextStyle from resolved style map.
     */
    fun buildTextStyle(style: Map<String, Any>?): TextStyle {
        if (style == null) return TextStyle()
        
        // Font size (fs or fontSize)
        val fontSize = (style["fs"] as? Number) ?: (style["fontSize"] as? Number)
        
        // Font weight (fw or fontWeight)
        val fontWeight = (style["fw"] as? String) ?: (style["fontWeight"] as? String)
        
        // Text color (c or color)
        val textColor = (style["c"] as? String) ?: (style["color"] as? String)
        val colorProvider = textColor?.let { parseColor(it) }?.let { ColorProvider(it) }
        
        return if (colorProvider != null) {
            TextStyle(
                fontSize = fontSize?.toFloat()?.sp,
                fontWeight = parseFontWeight(fontWeight),
                color = colorProvider
            )
        } else {
            TextStyle(
                fontSize = fontSize?.toFloat()?.sp,
                fontWeight = parseFontWeight(fontWeight)
            )
        }
    }
    
    private fun parseColor(colorString: String): androidx.compose.ui.graphics.Color? {
        return try {
            val hex = colorString.removePrefix("#")
            when (hex.length) {
                6 -> androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor("#FF$hex"))
                8 -> androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor("#$hex"))
                else -> null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse color: $colorString", e)
            null
        }
    }
    
    private fun parseFontWeight(weight: String?): FontWeight? {
        return when (weight?.lowercase()) {
            "bold", "700" -> FontWeight.Bold
            "medium", "500" -> FontWeight.Medium
            "normal", "400" -> FontWeight.Normal
            else -> null
        }
    }
}
