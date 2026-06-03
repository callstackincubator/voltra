import { evaluateWidgetModule, logger, type PrerenderedWidgetStates } from '@use-voltra/expo-plugin'

import type { DetectedIOSWidget } from './clientRendered'

/**
 * Track 5 / Phase 3b-iii step 4 — initial-state prerender for client-rendered widgets.
 *
 * For server-rendered widgets, the existing `prerenderWidgetState` in @use-voltra/expo-plugin
 * loads the file at `initialStatePath`, reads `exports.default` (a `WidgetVariants` object),
 * and runs it through the multi-family `renderWidgetToString` to produce a per-family JSON
 * payload that the runtime's `selectContentForFamily` will pick from.
 *
 * Client-rendered widgets work differently: the file exports a function
 * `(props, env) => JSX` (tagged with `'use voltra'`), and the runtime calls it per-render
 * with real env values. For the WidgetKit placeholder (`Provider.placeholder` and the
 * widget gallery preview) we need ONE pre-rendered JSON entry to display before any
 * Metro fetch completes. Per Q6 of the grilling, we generate that by calling the same
 * function at prebuild with empty props + a minimal env, and storing the compact
 * `{t, c, p}` JSON in the existing `voltra_initial_states.json`.
 *
 * The placeholder's env values are fixed (`widgetFamily: 'systemMedium'`,
 * `colorScheme: 'light'`, etc.) and may not match what the user actually sees the moment
 * they add the widget — but the first real timeline tick replaces this entry within
 * milliseconds, so the brief mismatch is invisible in practice.
 */

/** Locale key used for non-localized prerendered states (mirrors prerender.ts behavior). */
const SINGLE_LOCALE_KEY = '__default'

/**
 * Default env passed to client widgets at prebuild for the placeholder render. Fields
 * mirror `WidgetEnvironment` from packages/core/src/widget-environment.ts so the widget
 * function sees the same shape it gets at runtime.
 */
function buildPlaceholderEnv(): Record<string, unknown> {
  return {
    date: Date.now(),
    widgetFamily: 'systemMedium',
    colorScheme: 'light',
    locale: 'en-US',
    widgetRenderingMode: 'fullColor',
    showsWidgetContainerBackground: true,
    configuration: undefined,
    build: {
      isDev: false,
      metroUrl: null,
      appVersion: 'unknown',
      voltraVersion: '1.4.1',
    },
  }
}

/**
 * Prerender placeholder JSON for every client-rendered widget. Returns a map shaped
 * identically to `prerenderWidgetState`'s output so the two can be merged before
 * generating `VoltraWidgetInitialStates.swift`.
 */
export async function prerenderClientRenderedWidgets(
  widgets: DetectedIOSWidget[],
  projectRoot: string
): Promise<PrerenderedWidgetStates> {
  const results: PrerenderedWidgetStates = new Map()

  const clientWidgets = widgets.filter(
    (w): w is Extract<DetectedIOSWidget, { clientRendered: true }> => w.clientRendered
  )
  if (clientWidgets.length === 0) {
    return results
  }

  // Lazy-loaded so server-only projects never pull in @use-voltra/ios. The renderer
  // is iOS-specific by design — Track 5's Android counterpart will use the same shape
  // via @use-voltra/android in a future phase.
  const iosModuleId = '@use-voltra/ios'
  const { renderVoltraVariantToJson } = (await import(iosModuleId)) as {
    renderVoltraVariantToJson: (element: unknown) => unknown
  }

  const placeholderEnv = buildPlaceholderEnv()

  for (const widget of clientWidgets) {
    try {
      const exports = evaluateWidgetModule(projectRoot, widget.clientSourcePath)
      const widgetFn = exports[widget.clientComponentName]
      if (typeof widgetFn !== 'function') {
        throw new Error(
          `Expected the file to export a function named "${widget.clientComponentName}" ` +
            `(the widget id from app.json). Found: ${Object.keys(exports).join(', ') || '(no named exports)'}`
        )
      }

      const element = widgetFn({}, placeholderEnv)
      const json = renderVoltraVariantToJson(element)
      const jsonString = JSON.stringify(json)
      results.set(widget.id, new Map([[SINGLE_LOCALE_KEY, jsonString]]))
    } catch (error) {
      throw new Error(
        `Failed to prerender client-rendered widget "${widget.id}": ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  logger.info(`Prerendered ${clientWidgets.length} client-rendered widget placeholder(s)`)
  return results
}
