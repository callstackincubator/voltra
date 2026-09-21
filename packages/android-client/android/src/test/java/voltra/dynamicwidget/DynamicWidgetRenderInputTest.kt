package voltra.dynamicwidget

import androidx.compose.runtime.AbstractApplier
import androidx.compose.runtime.Composition
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.MonotonicFrameClock
import androidx.compose.runtime.Recomposer
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.Snapshot
import androidx.datastore.preferences.core.mutablePreferencesOf
import androidx.glance.LocalState
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetRenderInputTest {
    @Test
    fun observesSequentialPropsRevisionsAndLatestPersistedPropsWithoutAResize() =
        runTest {
            val context = RuntimeEnvironment.getApplication()
            val dynamicWidgetId = "weather-render-input"
            val dynamicWidgetPropsStore = DynamicWidgetPropsStore(context)
            var glanceState: Any by mutableStateOf(mutablePreferencesOf())
            val observedRenderInputs = mutableListOf<DynamicWidgetRenderInput>()

            withDynamicWidgetRenderInputComposition(
                content = {
                    CompositionLocalProvider(LocalState provides glanceState) {
                        val renderInput = currentDynamicWidgetRenderInput(context, dynamicWidgetId)
                        SideEffect { observedRenderInputs += renderInput }
                    }
                },
            ) { recomposer ->
                recomposer.awaitIdle()

                dynamicWidgetPropsStore.persistDynamicWidgetProps(dynamicWidgetId, """{"value":1}""")
                glanceState = mutablePreferencesOf(dynamicWidgetPropsRevisionKey to 1L)
                awaitRecomposition(recomposer)

                dynamicWidgetPropsStore.persistDynamicWidgetProps(dynamicWidgetId, """{"value":2}""")
                glanceState = mutablePreferencesOf(dynamicWidgetPropsRevisionKey to 2L)
                awaitRecomposition(recomposer)
            }

            assertEquals(
                listOf(
                    DynamicWidgetRenderInput(propsRevision = 0L, propsJson = "{}"),
                    DynamicWidgetRenderInput(propsRevision = 1L, propsJson = """{"value":1}"""),
                    DynamicWidgetRenderInput(propsRevision = 2L, propsJson = """{"value":2}"""),
                ),
                observedRenderInputs,
            )
        }

    @Test
    fun readsLatestPersistedPropsWhenIntermediateUpdatesAreCoalesced() =
        runTest {
            val context = RuntimeEnvironment.getApplication()
            val dynamicWidgetId = "weather-latest-render-input"
            val dynamicWidgetPropsStore = DynamicWidgetPropsStore(context)
            var glanceState: Any by mutableStateOf(mutablePreferencesOf())
            val observedRenderInputs = mutableListOf<DynamicWidgetRenderInput>()

            withDynamicWidgetRenderInputComposition(
                content = {
                    CompositionLocalProvider(LocalState provides glanceState) {
                        val renderInput = currentDynamicWidgetRenderInput(context, dynamicWidgetId)
                        SideEffect { observedRenderInputs += renderInput }
                    }
                },
            ) { recomposer ->
                recomposer.awaitIdle()

                dynamicWidgetPropsStore.persistDynamicWidgetProps(dynamicWidgetId, """{"value":1}""")
                dynamicWidgetPropsStore.persistDynamicWidgetProps(dynamicWidgetId, """{"value":2}""")
                glanceState = mutablePreferencesOf(dynamicWidgetPropsRevisionKey to 2L)
                awaitRecomposition(recomposer)
            }

            assertEquals(
                DynamicWidgetRenderInput(propsRevision = 2L, propsJson = """{"value":2}"""),
                observedRenderInputs.last(),
            )
        }

    private suspend fun withDynamicWidgetRenderInputComposition(
        content: @androidx.compose.runtime.Composable () -> Unit,
        assertions: suspend (Recomposer) -> Unit,
    ) {
        val compositionContext = kotlin.coroutines.coroutineContext + ImmediateFrameClock
        val recomposer = Recomposer(compositionContext)
        val composition = Composition(DynamicWidgetTestApplier(), recomposer)
        val recomposerJob =
            kotlinx.coroutines.CoroutineScope(compositionContext).launch {
                recomposer.runRecomposeAndApplyChanges()
            }

        try {
            composition.setContent(content)
            assertions(recomposer)
        } finally {
            composition.dispose()
            recomposer.close()
            recomposerJob.join()
        }
    }

    private suspend fun awaitRecomposition(recomposer: Recomposer) {
        Snapshot.sendApplyNotifications()
        yield()
        recomposer.awaitIdle()
    }

    private object ImmediateFrameClock : MonotonicFrameClock {
        override suspend fun <R> withFrameNanos(onFrame: (Long) -> R): R = onFrame(System.nanoTime())
    }

    private class DynamicWidgetTestApplier : AbstractApplier<Unit>(Unit) {
        override fun insertTopDown(
            index: Int,
            instance: Unit,
        ) = Unit

        override fun insertBottomUp(
            index: Int,
            instance: Unit,
        ) = Unit

        override fun remove(
            index: Int,
            count: Int,
        ) = Unit

        override fun move(
            from: Int,
            to: Int,
            count: Int,
        ) = Unit

        override fun onClear() = Unit
    }
}
