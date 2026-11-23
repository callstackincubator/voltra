package voltra.dynamicwidget

import voltra.models.VoltraNode

/**
 * What rendering one placement of a Dynamic Widget produced: a node, or the reason it did not
 * (ADR 0013). Failures used to collapse into a `null` that said nothing about which stage broke.
 */
internal sealed interface DynamicWidgetRenderOutcome {
    /**
     * [nodeJson] is the resolved node JSON `render()` returned, kept next to the parsed [node] so
     * the last-good store can persist it without re-serializing the tree.
     */
    data class Success(
        val node: VoltraNode,
        val nodeJson: String,
    ) : DynamicWidgetRenderOutcome

    data class Failure(
        val stage: Stage,
        val message: String,
        val stack: String?,
    ) : DynamicWidgetRenderOutcome

    enum class Stage {
        Bundle,
        Evaluate,
        Render,
        Parse,
        ;

        /** The lowercase name the `VoltraDynamicWidget` log line and the dev error view print. */
        val label: String get() = name.lowercase()
    }
}
