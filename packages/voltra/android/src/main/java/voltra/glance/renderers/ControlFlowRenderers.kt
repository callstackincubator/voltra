package voltra.glance.renderers

import androidx.compose.runtime.Composable
import voltra.glance.LocalVoltraRenderContext
import voltra.models.VoltraElement
import voltra.models.componentProp
import voltra.models.resolveToVoltraNode
import voltra.resolvable.ResolvableValueEvaluator

@Composable
fun RenderControlIf(element: VoltraElement) {
    val context = LocalVoltraRenderContext.current

    if (ResolvableValueEvaluator.evaluateCondition(element.p?.get("condition"))) {
        RenderNode(element.c)
    } else {
        val elseNode = element.componentProp("else", context.sharedStyles, context.sharedElements)
        RenderNode(elseNode)
    }
}

@Composable
fun RenderControlSwitch(element: VoltraElement) {
    val context = LocalVoltraRenderContext.current

    @Suppress("UNCHECKED_CAST")
    val cases = element.p?.get("cases") as? Map<String, Any?> ?: return
    val key = controlSwitchMatchKey(element.p?.get("value"))
    val caseValue = cases[key] ?: cases["default"] ?: return

    RenderNode(resolveToVoltraNode(caseValue, context.sharedStyles, context.sharedElements))
}

private fun controlSwitchMatchKey(value: Any?): String =
    when (value) {
        null -> "null"
        is Boolean -> if (value) "true" else "false"
        is Number -> {
            val d = value.toDouble()
            if (d.isFinite() && kotlin.math.floor(d) == d) d.toLong().toString() else d.toString()
        }
        is String -> value
        else -> "default"
    }
