import { reloadAndroidWidgets } from '../widgets/api.js'

declare global {
  var __accept: (...args: unknown[]) => void
}

/**
 * Trigger a widget reload on every Metro Fast Refresh patch (DEV only).
 *
 * Hooks the global `__accept` callback Metro fires when a Fast Refresh patch lands in the host
 * app's JS runtime. When fired, reloads all widgets — for Dynamic Widgets this re-runs
 * `provideGlance`, which re-fetches the freshest bundle from Metro and re-renders. Counterpart of
 * iOS's `enableWidgetHotReload`.
 *
 * Effective while the host app's JS thread is alive (foreground). Call once at app startup.
 * Returns `dispose()` to restore the prior `__accept`. No-op in release builds.
 */
export function enableWidgetHotReload(): () => void {
  if (!__DEV__) {
    return () => {}
  }

  const oldAccept = global['__accept']
  global['__accept'] = (...args) => {
    void reloadAndroidWidgets()
    oldAccept?.(...args)
  }

  return () => {
    global['__accept'] = oldAccept
  }
}
