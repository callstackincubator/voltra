import { evaluateWidgetModule, logger, type PrerenderedWidgetStates } from '@use-voltra/expo-plugin'

import type { DetectedAndroidWidget } from '../clientRendered'

/**
 * Placeholder prerender for client-rendered Android widgets — the counterpart of the iOS
 * plugin's clientRenderedPrerender.ts.
 *
 * Server-rendered widgets prerender from `exports.default` (a variants object). Client widgets
 * instead export a `(props, env) => JSX` function, so there is no default state to prerender.
 * To still show something before the first Metro fetch (and when offline), we call that function
 * once at prebuild with empty props + a minimal env, render the single node via
 * `renderAndroidVariantToJson`, and store it in the same `voltra_initial_states.json` the runtime
 * already reads. `VoltraClientGlanceWidget` decodes that node for its fallback.
 */

const SINGLE_LOCALE_KEY = '__default'

function buildPlaceholderEnv(): Record<string, unknown> {
  return {
    date: Date.now(),
    widgetFamily: '200x200',
    colorScheme: 'light',
    locale: 'en-US',
    configuration: undefined,
    build: {
      isDev: false,
      metroUrl: null,
      appVersion: 'unknown',
      voltraVersion: '1.4.1',
    },
  }
}

export async function prerenderClientRenderedAndroidWidgets(
  widgets: DetectedAndroidWidget[],
  projectRoot: string
): Promise<PrerenderedWidgetStates> {
  const results: PrerenderedWidgetStates = new Map()

  const clientWidgets = widgets.filter(
    (w): w is Extract<DetectedAndroidWidget, { clientRendered: true }> => w.clientRendered
  )
  if (clientWidgets.length === 0) {
    return results
  }

  // Dynamic import keeps the plugin CommonJS-compatible and resolves the current package entry.
  const androidModuleId = '@use-voltra/android'
  const { renderAndroidVariantToJson } = (await import(androidModuleId)) as {
    renderAndroidVariantToJson: (element: unknown) => unknown
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
      const json = renderAndroidVariantToJson(element)
      results.set(widget.id, new Map([[SINGLE_LOCALE_KEY, JSON.stringify(json)]]))
    } catch (error) {
      throw new Error(
        `Failed to prerender client-rendered widget "${widget.id}": ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  logger.info(`Prerendered ${clientWidgets.length} client-rendered Android widget placeholder(s)`)
  return results
}
