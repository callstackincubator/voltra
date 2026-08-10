import { getFastRefreshHub } from '@use-voltra/android'

import { reloadAndroidWidgets } from '../widgets/api.js'

/**
 * Trigger a widget reload on every Metro Fast Refresh patch (DEV only).
 *
 * Subscribes to the shared {@link getFastRefreshHub}, which wraps the global
 * `__accept` callback Metro fires when a Fast Refresh patch lands in the host
 * app's JS runtime. On each debounced patch it reloads all widgets — for Dynamic
 * Widgets this re-runs `provideGlance`, which re-fetches the freshest bundle from
 * Metro and re-renders. Counterpart of iOS's `enableWidgetHotReload`.
 *
 * Effective while the host app's JS thread is alive (foreground). Call once at
 * app startup. Returns `dispose()` to unsubscribe. No-op in release builds.
 */
export function enableWidgetHotReload(): () => void {
  if (!__DEV__) {
    return () => {}
  }

  return getFastRefreshHub().onPatch(() => {
    void reloadAndroidWidgets()
  })
}
