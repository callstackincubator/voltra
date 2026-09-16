package voltra.dynamicwidget.serverupdate

import android.content.Context
import androidx.glance.action.Action
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.dynamicwidget.VoltraClientGlanceWidget
import voltra.widget.server.ResolvedWidgetServerSettings
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerDefaultsStore
import voltra.widget.server.WidgetServerRequestBuilder

/**
 * The refresh button refreshes the placement that drew it.
 *
 * Both halves of that are exercised against the production call sites rather than against a
 * round-trip helper: the scope [VoltraClientGlanceWidget] hands to `refreshAction`, and the
 * parameters [DynamicWidgetServerEnvironmentSource] actually writes into the button. Reintroducing
 * the bug at either site has to turn one of these red.
 */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetRefreshScopeTest {
    private val context: Context = RuntimeEnvironment.getApplication()

    private val widgetId = "portfolio"
    private val configuration = mapOf("city" to "London")
    private val appWidgetId = 42

    /** What VoltraClientGlanceWidget.Content renders with, and reads env.serverUpdate for. */
    private val placementScope = WidgetScope.of(widgetId, configuration)

    private fun refreshingSource() =
        DynamicWidgetServerEnvironmentSource {
            WidgetServerDefaultsStore { """{"$widgetId":{"intervalMinutes":15,"refresh":true}}""" }
        }

    /**
     * The parameters Glance would carry to the callback. `RunCallbackAction` exposes them through a
     * single no-arg accessor; matched by return type so the accessor's name is not pinned.
     */
    private fun parametersOf(action: Action): ActionParameters {
        val accessor =
            action.javaClass.methods.first {
                it.returnType == ActionParameters::class.java && it.parameterCount == 0
            }

        return accessor.apply { isAccessible = true }.invoke(action) as ActionParameters
    }

    /** The scope a tap actually runs, end to end from the widget's own scope decision. */
    private fun tappedScope(renderedAppWidgetId: Int?): WidgetScope? {
        val scope = VoltraClientGlanceWidget.placementScope(widgetId, configuration, renderedAppWidgetId)
        val action = refreshingSource().refreshAction(context, scope)

        assertNotNull("the widget is configured with refresh: true, so it draws a button", action)

        return DynamicWidgetRefreshActionCallback.scopeFrom(parametersOf(action!!))
    }

    @Test
    fun `a configured placement's button refreshes that placement`() {
        assertEquals(placementScope, tappedScope(appWidgetId))
    }

    @Test
    fun `an unconfigured widget's button refreshes the widget scope`() {
        val scope = VoltraClientGlanceWidget.placementScope(widgetId, emptyMap(), appWidgetId)
        val action = refreshingSource().refreshAction(context, scope)!!

        assertEquals(WidgetScope.Widget(widgetId), scope)
        assertEquals(scope, DynamicWidgetRefreshActionCallback.scopeFrom(parametersOf(action)))
    }

    @Test
    fun `a placement Glance could not identify still refreshes something`() {
        // The render degraded to the widget-type configuration, which may match no placement at
        // all. Refreshing at widget scope keeps the button working rather than enqueueing work the
        // worker cancels as orphaned.
        assertEquals(WidgetScope.Widget(widgetId), tappedScope(null))
    }

    @Test
    fun `a widget without refresh draws no button`() {
        val source =
            DynamicWidgetServerEnvironmentSource {
                WidgetServerDefaultsStore { """{"$widgetId":{"intervalMinutes":15,"refresh":false}}""" }
            }

        assertEquals(null, source.refreshAction(context, placementScope))
    }

    @Test
    fun `a button drawn before the instance key existed falls back to the widget scope`() {
        val legacyParameters = actionParametersOf(DynamicWidgetRefreshActionCallback.KEY_WIDGET_ID to widgetId)

        assertEquals(WidgetScope.Widget(widgetId), DynamicWidgetRefreshActionCallback.scopeFrom(legacyParameters))
    }

    @Test
    fun `parameters with no widget id name no scope`() {
        assertEquals(null, DynamicWidgetRefreshActionCallback.scopeFrom(actionParametersOf()))
    }

    @Test
    fun `a successful refresh is visible to the placement that asked for it`() {
        val store = DynamicWidgetServerPropsStore(context)

        store.recordSuccess(tappedScope(appWidgetId)!!, fetchedAt = 1_726_000_000_000L, httpStatus = 200)

        assertEquals(
            "the placement should see the refresh it triggered",
            DynamicWidgetServerStatus.STATUS_FRESH,
            store.status(placementScope).status,
        )
    }

    @Test
    fun `a refresh asks the server for the placement's configuration`() {
        val settings =
            ResolvedWidgetServerSettings(
                url = "https://example.com/widgets",
                intervalMinutes = 15,
                enabled = true,
                method = "GET",
                query = emptyMap(),
                headers = emptyMap(),
                body = null,
            )

        val request =
            WidgetServerRequestBuilder.build(context, tappedScope(appWidgetId)!!, settings, null, configuration)

        assertTrue(
            "the refresh request should carry the placement's configuration, got ${request?.url}",
            request?.url?.toString()?.contains("configuration=") == true,
        )
    }
}
