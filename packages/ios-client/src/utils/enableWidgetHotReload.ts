import { getFastRefreshHub } from '@use-voltra/ios'

import { reloadWidgets } from '../widgets/widget-api.js'

/**
 * Trigger `reloadWidgets()` on every Metro Fast Refresh patch (DEV only).
 *
 * Subscribes to the shared {@link getFastRefreshHub}, which wraps the global
 * `__accept` callback Metro fires when a Fast Refresh patch lands in the host
 * app's JS runtime. On each debounced patch it calls
 * `WidgetCenter.shared.reloadAllTimelines()` so WidgetKit re-invokes each widget
 * Provider, which re-fetches the freshest bundle from Metro and renders the
 * updated UI.
 *
 * Only effective while the host app's JS thread is alive — iOS suspends the
 * RN runtime within ~5 seconds of backgrounding, so the "edit while staring at
 * the home screen, never touch the host app" case is not covered. For that
 * workflow the dev still relies on WidgetKit's natural lifecycle refresh on
 * app foreground.
 *
 * Call once at app startup. Returns `dispose()` to unsubscribe (rarely needed
 * in practice). No-op in release builds.
 */
export function enableWidgetHotReload(): () => void {
  if (!__DEV__) {
    return () => {}
  }

  return getFastRefreshHub().onPatch(() => {
    void reloadWidgets()
  })
}
