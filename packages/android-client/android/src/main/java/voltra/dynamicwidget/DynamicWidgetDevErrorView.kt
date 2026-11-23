package voltra.dynamicwidget

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text

/** The most stack frames the dev error view prints; the widget is small. */
internal const val DEV_ERROR_MAX_STACK_FRAMES = 6

/**
 * The `at …` frames of a JS stack, at most [limit]. Hermes prints the error's own `Name: message`
 * line first and the view already shows the message, so only the frames are kept.
 */
internal fun devErrorStackFrames(
    stack: String?,
    limit: Int = DEV_ERROR_MAX_STACK_FRAMES,
): List<String> =
    stack
        ?.lineSequence()
        ?.map { it.trim() }
        ?.filter { it.startsWith("at ") }
        ?.take(limit)
        ?.toList()
        .orEmpty()

/**
 * The dev error view (ADR 0013, section 3): widget id, stage, message, up to
 * [DEV_ERROR_MAX_STACK_FRAMES] stack frames and "Tap to retry", on a red-tinted surface.
 *
 * Built from plain Glance primitives rather than a `VoltraNode`, so it cannot fail the way the
 * content did. The whole surface is the retry target.
 */
@Composable
internal fun DynamicWidgetDevErrorView(
    widgetId: String,
    failure: DynamicWidgetRenderOutcome.Failure,
) {
    val textColor =
        androidx.glance.color.ColorProvider(day = Color(0xFF5F1412), night = Color(0xFFF9DEDC))
    val frames = devErrorStackFrames(failure.stack)

    Column(
        modifier =
            GlanceModifier
                .fillMaxSize()
                .background(
                    androidx.glance.color.ColorProvider(day = Color(0xFFFDECEA), night = Color(0xFF3B1A19)),
                ).padding(12.dp)
                .clickable(
                    actionRunCallback<DynamicWidgetRetryActionCallback>(
                        DynamicWidgetRetryActionCallback.parametersFor(widgetId),
                    ),
                ),
    ) {
        // End padding keeps the title clear of the server refresh button drawn over the corner.
        Text(
            text = "Dynamic Widget \"$widgetId\" failed (${failure.stage.label})",
            maxLines = 2,
            modifier = GlanceModifier.padding(end = 36.dp),
            style =
                androidx.glance.text.TextStyle(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor,
                ),
        )
        // The message and frames take whatever height is left, so the footer always fits.
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                text = failure.message,
                maxLines = 4,
                style = androidx.glance.text.TextStyle(fontSize = 11.sp, color = textColor),
            )
            frames.forEach { frame ->
                Text(
                    text = "  $frame",
                    maxLines = 1,
                    style = androidx.glance.text.TextStyle(fontSize = 9.sp, color = textColor),
                )
            }
        }
        Text(
            text = "Tap to retry",
            maxLines = 1,
            style =
                androidx.glance.text.TextStyle(
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor,
                ),
        )
    }
}
