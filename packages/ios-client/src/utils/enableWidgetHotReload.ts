import { reloadWidgets } from '../widgets/widget-api.js'

declare global {
  var __accept: (...args: unknown[]) => void
}

/**
 * Trigger `reloadWidgets()` on every Metro Fast Refresh patch (DEV only).
 *
 * Hooks the global `__accept` callback Metro fires when a Fast Refresh patch
 * lands in the host app's JS runtime. When fired, calls
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
 * Call once at app startup. Returns `dispose()` to restore the prior
 * `__accept` (rarely needed in practice). No-op in release builds.
 */
export function enableWidgetHotReload(): () => void {
  if (!__DEV__) {
    return () => {}
  }

  const oldAccept = global['__accept']
  global['__accept'] = (...args) => {
    void reloadWidgets()
    oldAccept?.(...args)
  }

  return () => {
    global['__accept'] = oldAccept
  }
}
