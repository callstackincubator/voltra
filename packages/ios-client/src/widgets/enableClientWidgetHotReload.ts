import { Platform } from 'react-native'

import { reloadWidgets } from './widget-api.js'

/**
 * Track 5 / Phase 3b-iii step 5b — dev hot reload for client-rendered widgets.
 *
 * Call once at app startup in DEBUG builds and the widget extension will refresh
 * automatically when any `'use voltra'` widget JSX file changes. No widget timeline
 * polling, no manual button taps — saves propagate within seconds.
 *
 * @example
 *   import { enableClientWidgetHotReload } from '@use-voltra/ios-client'
 *
 *   if (__DEV__) {
 *     enableClientWidgetHotReload()
 *   }
 *
 * How it works (intentionally minimal):
 *
 *   - Metro's HMR runtime, when it accepts a hot update, invokes a global function
 *     called `__accept` inside the host app's RN runtime. The same global is the
 *     hook used by `useUpdateOnHMR` for in-app components — see
 *     packages/ios-client/src/utils/useUpdateOnHMR.ts.
 *
 *   - We wrap that global so the existing callback (if any) still runs, then debounce
 *     a call to `reloadWidgets()`. That invokes `WidgetCenter.shared.reloadAllTimelines()`
 *     in the iOS extension; WidgetKit calls each Provider's `getTimeline`; each
 *     client-rendered Provider re-fetches the (now-fresh) bundle from Metro.
 *
 * Caveats (PoC-level):
 *
 *   - The trigger fires on ANY hot update Metro emits, not just widget JSX changes.
 *     The widget extension re-evaluates its bundle whether the change was relevant
 *     or not. With one widget bundle in dev this is harmless; with many widgets
 *     we'd want a finer signal (e.g. a Voltra Metro middleware that pushes
 *     widget-change events explicitly).
 *
 *   - Has no effect when not running against Metro (release builds, no `__DEV__`).
 *     Has no effect on Android — Track 5's Android counterpart will land in Phase 4.
 *
 * Returns a teardown function that restores the previous `__accept` hook. Useful
 * for tests; rarely needed in app code (the host app typically calls this once and
 * never tears it down).
 */

// `global.__accept` is already declared in packages/ios-client/src/utils/useUpdateOnHMR.ts
// (declarations merge automatically within the package). We treat the previous value as
// possibly-undefined since this function may be called before any other subscriber.

export interface EnableClientWidgetHotReloadOptions {
  /** Milliseconds to coalesce rapid-fire HMR events before calling reloadWidgets.
   *  Default 250ms — short enough to feel instant, long enough to absorb the burst
   *  of accept calls a single save typically produces. */
  debounceMs?: number
  /** Explicit widget id list to reload. Default `undefined` reloads all widgets,
   *  which is fine for the PoC. Use this if you have many widgets and only want
   *  some of them to refresh on hot reload. */
  widgetIds?: string[]
}

export function enableClientWidgetHotReload(options: EnableClientWidgetHotReloadOptions = {}): () => void {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return noop
  }

  const { debounceMs = 250, widgetIds } = options

  let pendingTimer: ReturnType<typeof setTimeout> | null = null

  const triggerReload = () => {
    if (pendingTimer) {
      clearTimeout(pendingTimer)
    }
    pendingTimer = setTimeout(() => {
      pendingTimer = null
      reloadWidgets(widgetIds && widgetIds.length > 0 ? widgetIds : undefined).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[Voltra] enableClientWidgetHotReload: reloadWidgets failed — ${message}`)
      })
    }, debounceMs)
  }

  const previousAccept: ((...args: unknown[]) => void) | undefined =
    typeof global.__accept === 'function' ? global.__accept : undefined
  global.__accept = (...args: unknown[]) => {
    triggerReload()
    previousAccept?.(...args)
  }

  return () => {
    // Restore the previous hook. If there was none, set to a no-op so subsequent reads
    // (e.g. from other Voltra hooks like useUpdateOnHMR) don't blow up.
    global.__accept = previousAccept ?? noop
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      pendingTimer = null
    }
  }
}

const noop = () => {}
