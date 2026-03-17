package voltra.glance.renderers

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.appwidget.CheckBox
import androidx.glance.appwidget.CheckboxDefaults
import androidx.glance.appwidget.RadioButton
import androidx.glance.appwidget.RadioButtonDefaults
import androidx.glance.appwidget.Switch
import androidx.glance.appwidget.SwitchDefaults
import androidx.glance.unit.ColorProvider
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.styling.JSColorParser
import voltra.styling.StyleConverter
import voltra.styling.toGlanceTextStyle

@Composable
fun RenderSwitch(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = androidx.glance.LocalContext.current
    val renderContext = LocalVoltraRenderContext.current
    val computedModifier = modifier ?: resolveAndApplyStyle(element.p, renderContext.sharedStyles).modifier

    val componentId = element.i ?: "switch_${element.hashCode()}"
    val checked = (element.p?.get("checked") as? Boolean) ?: false

    val text = (element.p?.get("text") as? String) ?: ""
    val maxLines = (element.p?.get("maxLines") as? Number)?.toInt() ?: Int.MAX_VALUE

    val styleMap = element.p?.get("style") as? Map<String, Any?>
    val textStyle =
        if (styleMap != null) {
            StyleConverter.convert(styleMap).text.toGlanceTextStyle()
        } else {
            null
        }

    val thumbChecked = element.p?.get("thumbCheckedColor") as? String
    val thumbUnchecked = element.p?.get("thumbUncheckedColor") as? String
    val trackChecked = element.p?.get("trackCheckedColor") as? String
    val trackUnchecked = element.p?.get("trackUncheckedColor") as? String

    val colors =
        if (thumbChecked != null && thumbUnchecked != null && trackChecked != null && trackUnchecked != null) {
            val tc = JSColorParser.parse(thumbChecked)
            val tuc = JSColorParser.parse(thumbUnchecked)
            val trc = JSColorParser.parse(trackChecked)
            val truc = JSColorParser.parse(trackUnchecked)

            if (tc != null && tuc != null && trc != null && truc != null) {
                SwitchDefaults.colors(
                    checkedThumbColor = ColorProvider(tc),
                    uncheckedThumbColor = ColorProvider(tuc),
                    checkedTrackColor = ColorProvider(trc),
                    uncheckedTrackColor = ColorProvider(truc),
                )
            } else {
                SwitchDefaults.colors()
            }
        } else {
            SwitchDefaults.colors()
        }

    Switch(
        checked = checked,
        onCheckedChange = getOnClickAction(LocalContext.current, element.p, renderContext.widgetId, componentId),
        modifier = computedModifier,
        text = text,
        style = textStyle,
        maxLines = maxLines,
        colors = colors,
    )
}

@Composable
fun RenderRadioButton(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = androidx.glance.LocalContext.current
    val renderContext = LocalVoltraRenderContext.current
    val computedModifier = modifier ?: resolveAndApplyStyle(element.p, renderContext.sharedStyles).modifier

    val componentId = element.i ?: "radio_${element.hashCode()}"
    val checked = (element.p?.get("checked") as? Boolean) ?: false

    val text = (element.p?.get("text") as? String) ?: ""
    val maxLines = (element.p?.get("maxLines") as? Number)?.toInt() ?: Int.MAX_VALUE
    val enabled = (element.p?.get("enabled") as? Boolean) ?: true

    val styleMap = element.p?.get("style") as? Map<String, Any?>
    val textStyle =
        if (styleMap != null) {
            StyleConverter.convert(styleMap).text.toGlanceTextStyle()
        } else {
            null
        }

    val checkedColor = element.p?.get("checkedColor") as? String
    val uncheckedColor = element.p?.get("uncheckedColor") as? String

    val colors =
        if (checkedColor != null && uncheckedColor != null) {
            val c = JSColorParser.parse(checkedColor)
            val uc = JSColorParser.parse(uncheckedColor)
            if (c != null && uc != null) {
                RadioButtonDefaults.colors(ColorProvider(c), ColorProvider(uc))
            } else {
                RadioButtonDefaults.colors()
            }
        } else {
            RadioButtonDefaults.colors()
        }

    RadioButton(
        checked = checked,
        onClick = getOnClickAction(LocalContext.current, element.p, renderContext.widgetId, componentId),
        modifier = computedModifier,
        enabled = enabled,
        text = text,
        style = textStyle,
        maxLines = maxLines,
        colors = colors,
    )
}

@Composable
fun RenderCheckBox(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = androidx.glance.LocalContext.current
    val renderContext = LocalVoltraRenderContext.current
    val computedModifier = modifier ?: resolveAndApplyStyle(element.p, renderContext.sharedStyles).modifier

    val componentId = element.i ?: "checkbox_${element.hashCode()}"
    val checked = (element.p?.get("checked") as? Boolean) ?: false

    val text = (element.p?.get("text") as? String) ?: ""
    val maxLines = (element.p?.get("maxLines") as? Number)?.toInt() ?: Int.MAX_VALUE

    val styleMap = element.p?.get("style") as? Map<String, Any?>
    val textStyle =
        if (styleMap != null) {
            StyleConverter.convert(styleMap).text.toGlanceTextStyle()
        } else {
            null
        }

    val checkedColor = element.p?.get("checkedColor") as? String
    val uncheckedColor = element.p?.get("uncheckedColor") as? String

    val colors =
        if (checkedColor != null && uncheckedColor != null) {
            val c = JSColorParser.parse(checkedColor)
            val uc = JSColorParser.parse(uncheckedColor)
            if (c != null && uc != null) {
                CheckboxDefaults.colors(ColorProvider(c), ColorProvider(uc))
            } else {
                CheckboxDefaults.colors()
            }
        } else {
            CheckboxDefaults.colors()
        }

    CheckBox(
        checked = checked,
        onCheckedChange = getOnClickAction(LocalContext.current, element.p, renderContext.widgetId, componentId),
        modifier = computedModifier,
        text = text,
        style = textStyle,
        maxLines = maxLines,
        colors = colors,
    )
}
