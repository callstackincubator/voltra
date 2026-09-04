package voltra.widget

import android.content.Context
import android.content.pm.ActivityInfo
import android.content.pm.PackageInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class VoltraWidgetReceiversTest {
    private val context: Context get() = RuntimeEnvironment.getApplication()

    @Before
    fun resetResolvedReceivers() {
        VoltraWidgetReceivers.clearCache()
    }

    /**
     * The applicationId carries a flavour suffix, so the generated receiver lives in the
     * namespace package and cannot be derived from the package name.
     */
    @Test
    fun resolvesReceiverWhenApplicationIdDiffersFromNamespace() {
        declareReceivers("com.example.app.widget.VoltraWidget_weatherReceiver")

        val componentName = VoltraWidgetReceivers.componentName(context, "weather")

        assertEquals(context.packageName, componentName.packageName)
        assertEquals("com.example.app.widget.VoltraWidget_weatherReceiver", componentName.className)
    }

    @Test
    fun resolvesEveryDeclaredReceiverKeyedByWidgetId() {
        declareReceivers(
            "com.example.app.widget.VoltraWidget_weatherReceiver",
            "com.example.app.widget.VoltraWidget_portfolioReceiver",
            "com.example.app.SomeOtherReceiver",
        )

        val receivers = VoltraWidgetReceivers.installedReceivers(context)

        assertEquals(setOf("weather", "portfolio"), receivers.keys)
    }

    @Test
    fun fallsBackToTheGenerationConventionWhenNoReceiverIsDeclared() {
        declareReceivers()

        val componentName = VoltraWidgetReceivers.componentName(context, "weather")

        assertEquals(
            "${context.packageName}.widget.VoltraWidget_weatherReceiver",
            componentName.className,
        )
    }

    @Test
    fun readsWidgetIdBackFromAGeneratedReceiverClassName() {
        assertEquals(
            "weather",
            VoltraWidgetReceivers.widgetIdOrNull("com.example.app.widget.VoltraWidget_weatherReceiver"),
        )
        assertNull(VoltraWidgetReceivers.widgetIdOrNull("com.example.app.widget.WeatherReceiver"))
        assertNull(VoltraWidgetReceivers.widgetIdOrNull("com.example.app.widget.VoltraWidget_weather"))
        assertNull(VoltraWidgetReceivers.widgetIdOrNull("com.example.app.widget.VoltraWidget_Receiver"))
    }

    /** A widget id ending in `Receiver` must not have that suffix stripped twice. */
    @Test
    fun keepsAWidgetIdThatItselfEndsInReceiver() {
        assertEquals(
            "myReceiver",
            VoltraWidgetReceivers.widgetIdOrNull("com.example.app.widget.VoltraWidget_myReceiverReceiver"),
        )
    }

    /**
     * A failed read must not be cached: doing so would strand every later lookup on the
     * convention fallback for the rest of the process, with no way back.
     */
    @Test
    fun retriesAfterAFailedLookup() {
        shadowOf(context.packageManager).removePackage(context.packageName)
        assertTrue(VoltraWidgetReceivers.installedReceivers(context).isEmpty())

        declareReceivers("com.example.app.widget.VoltraWidget_weatherReceiver")

        assertEquals(
            "com.example.app.widget.VoltraWidget_weatherReceiver",
            VoltraWidgetReceivers.componentName(context, "weather").className,
        )
    }

    private fun declareReceivers(vararg classNames: String) {
        val packageInfo =
            PackageInfo().apply {
                packageName = context.packageName
                applicationInfo = context.applicationInfo
                receivers =
                    classNames
                        .map { className ->
                            ActivityInfo().apply {
                                this.name = className
                                this.packageName = context.packageName
                            }
                        }.toTypedArray()
            }
        shadowOf(context.packageManager).installPackage(packageInfo)
    }
}
