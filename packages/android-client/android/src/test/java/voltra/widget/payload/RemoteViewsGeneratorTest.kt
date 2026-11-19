package voltra.widget.payload

import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ResolveInfo
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.models.VoltraPayload
import voltra.payload.ComponentTypeID

@RunWith(RobolectricTestRunner::class)
class RemoteViewsGeneratorTest {
    private val application: Application = RuntimeEnvironment.getApplication()
    private val context: Context = application

    private val buttonWithoutDeepLink =
        VoltraNode.Element(VoltraElement(t = ComponentTypeID.FILLED_BUTTON, i = "tap", p = mapOf("text" to "Tap")))

    private fun clickableViews(root: View): List<View> {
        val children =
            (root as? ViewGroup)?.let { group ->
                (0 until group.childCount).flatMap { clickableViews(group.getChildAt(it)) }
            }
        return (children ?: emptyList()) + listOfNotNull(root.takeIf { it.hasOnClickListeners() })
    }

    @Test
    fun passesTheRealWidgetIdToTheLaunchIntentOfAButtonWithoutADeepLink() =
        runTest {
            // A button without a deep link falls back to launching the app, so the package needs a launcher activity.
            val launcher = ComponentName(context.packageName, "voltra.TestLauncherActivity")
            val launchIntent =
                Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setPackage(context.packageName)
            val resolveInfo =
                ResolveInfo().apply {
                    activityInfo =
                        ActivityInfo().apply {
                            packageName = launcher.packageName
                            name = launcher.className
                        }
                }
            shadowOf(context.packageManager).addResolveInfoForIntent(launchIntent, resolveInfo)

            val payload = VoltraPayload(v = 1, variants = mapOf("200x100" to buttonWithoutDeepLink))
            val views = RemoteViewsGenerator.generateWidgetRemoteViews(context, payload, "weather-widget")

            val applied = views.values.single().apply(context, FrameLayout(context))
            val clickable = clickableViews(applied)
            assertNotNull(clickable.firstOrNull())
            clickable.first().performClick()

            val started = shadowOf(application).nextStartedActivity
            assertNotNull(started)
            assertEquals("weather-widget", started.getStringExtra("widgetId"))
        }
}
