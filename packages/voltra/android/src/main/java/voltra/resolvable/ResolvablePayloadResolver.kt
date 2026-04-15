package voltra.resolvable

import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.models.VoltraPayload

/**
 * Walks decompressed payloads and evaluates any `$rv` expressions so native renderers see literals
 * (including Material `~` color tokens for Android env color keys).
 */
object ResolvablePayloadResolver {
    fun resolve(
        payload: VoltraPayload,
        environment: ResolvableRuntimeEnvironment,
    ): VoltraPayload =
        payload.copy(
            collapsed = payload.collapsed?.let { resolveNode(it, environment) },
            expanded = payload.expanded?.let { resolveNode(it, environment) },
            variants = payload.variants?.mapValues { (_, node) -> resolveNode(node, environment) },
            s = payload.s?.map { resolveMap(it, environment) },
            e = payload.e?.map { resolveNode(it, environment) },
        )

    private fun resolveNode(
        node: VoltraNode,
        environment: ResolvableRuntimeEnvironment,
    ): VoltraNode =
        when (node) {
            is VoltraNode.Element -> {
                VoltraNode.Element(
                    resolveElement(node.element, environment),
                )
            }

            is VoltraNode.Array -> {
                VoltraNode.Array(node.elements.map { resolveNode(it, environment) })
            }

            else -> {
                node
            }
        }

    private fun resolveElement(
        element: VoltraElement,
        environment: ResolvableRuntimeEnvironment,
    ): VoltraElement =
        element.copy(
            p = element.p?.let { resolveMap(it, environment) },
            c = element.c?.let { resolveNode(it, environment) },
        )

    private fun resolveMap(
        map: Map<String, Any?>,
        environment: ResolvableRuntimeEnvironment,
    ): Map<String, Any?> {
        val result = LinkedHashMap<String, Any?>()
        for ((key, value) in map) {
            result[key] = resolveValue(value, environment)
        }
        return result
    }

    private fun resolveValue(
        value: Any?,
        environment: ResolvableRuntimeEnvironment,
    ): Any? =
        when (value) {
            is Map<*, *> -> {
                @Suppress("UNCHECKED_CAST")
                val m = value as Map<String, Any?>
                if (m.size == 1 && m.containsKey(ResolvableWireKey.SENTINEL)) {
                    ResolvableValueEvaluator.resolveRoot(value, environment)
                } else {
                    resolveMap(m, environment)
                }
            }

            is List<*> -> {
                value.map { resolveValue(it, environment) }
            }

            else -> {
                value
            }
        }
}
