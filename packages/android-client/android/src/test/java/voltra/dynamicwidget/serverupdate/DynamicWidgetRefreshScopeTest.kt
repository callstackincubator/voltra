package voltra.dynamicwidget.serverupdate

import android.content.Context
import androidx.glance.action.actionParametersOf
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.widget.server.ResolvedWidgetServerSettings
import voltra.widget.server.WidgetScope
import voltra.widget.server.WidgetServerRequestBuilder

/**
 * The refresh button refreshes the placement that drew it.
 *
 * The button is built in one process and tapped in another, with only [ActionParameters] in
 * between, so the placement's scope has to survive that round trip. It used to be rebuilt from the
 * widget id alone, which sent a configured placement's tap to the widget scope: the wrong fetch,
 * committed to a slot the placement does not read, with a status record it never sees.
 */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetRefreshScopeTest {
    private val context: Context = RuntimeEnvironment.getApplication()

    private val widgetId = "portfolio"
    private val configuration = mapOf("city" to "London")

    /** What VoltraClientGlanceWidget.Content renders with, and reads env.serverUpdate for. */
    private val placementScope = WidgetScope.of(widgetId, configuration)

    private fun settings() =
        ResolvedWidgetServerSettings(
            url = "https://example.com/widgets",
            intervalMinutes = 15,
            enabled = true,
            method = "GET",
            query = emptyMap(),
            headers = emptyMap(),
            body = null,
        )

    private fun tappedScope(scope: WidgetScope) =
        DynamicWidgetRefreshActionCallback.scopeFrom(
            DynamicWidgetRefreshActionCallback.parametersFor(scope),
        )

    @Test
    fun `a configured placement's button refreshes that placement`() {
        assertEquals(placementScope, tappedScope(placementScope))
    }

    @Test
    fun `an unconfigured widget's button still refreshes the widget scope`() {
        val scope = WidgetScope.of(widgetId, emptyMap())

        assertEquals(WidgetScope.Widget(widgetId), scope)
        assertEquals(scope, tappedScope(scope))
    }

    @Test
    fun `a button drawn before the instance key existed falls back to the widget scope`() {
        val legacyParameters =
            actionParametersOf(DynamicWidgetRefreshActionCallback.KEY_WIDGET_ID to widgetId)

        assertEquals(WidgetScope.Widget(widgetId), DynamicWidgetRefreshActionCallback.scopeFrom(legacyParameters))
    }

    @Test
    fun `parameters with no widget id name no scope`() {
        assertEquals(null, DynamicWidgetRefreshActionCallback.scopeFrom(actionParametersOf()))
    }

    @Test
    fun `a successful refresh is visible to the placement that asked for it`() {
        val store = DynamicWidgetServerPropsStore(context)

        store.recordSuccess(tappedScope(placementScope)!!, fetchedAt = 1_726_000_000_000L, httpStatus = 200)

        assertEquals(
            "the placement should see the refresh it triggered",
            DynamicWidgetServerStatus.STATUS_FRESH,
            store.status(placementScope).status,
        )
    }

    @Test
    fun `a refresh asks the server for the placement's configuration`() {
        val request =
            WidgetServerRequestBuilder.build(context, tappedScope(placementScope)!!, settings(), null, configuration)

        assertTrue(
            "the refresh request should carry the placement's configuration, got ${request?.url}",
            request?.url?.toString()?.contains("configuration=") == true,
        )
    }
}
