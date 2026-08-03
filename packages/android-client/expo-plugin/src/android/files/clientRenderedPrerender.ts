import {
  evaluateWidgetModuleExports,
  logger,
  resolveInstalledPackageVersion,
  type PrerenderedWidgetStates,
} from '@use-voltra/expo-plugin'

import type { DetectedAndroidWidget } from '../clientRendered'

/**
 * Placeholder prerender for Dynamic Android Widgets — the counterpart of the iOS
 * plugin's clientRenderedPrerender.ts.
 *
 * Widgets with `initialStatePath` prerender from `exports.default` (a variants object).
 * Dynamic Widgets instead default-export a `(props, env) => JSX` function, so there is no
 * default state to prerender. To still show something before the first Metro fetch (and when
 * offline), we call that function once at prebuild with empty props + a minimal env, render the
 * single node via `renderAndroidVariantToJson`, and store it in the same
 * `voltra_initial_states.json` the runtime already reads. `VoltraClientGlanceWidget` decodes that
 * node for its fallback.
 */

const SINGLE_LOCALE_KEY = '__default'

function buildPlaceholderEnv(voltraVersion: string): Record<string, unknown> {
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
      voltraVersion,
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

  const placeholderEnv = buildPlaceholderEnv(resolveInstalledPackageVersion(projectRoot, '@use-voltra/android-client'))

  for (const widget of clientWidgets) {
    try {
      const widgetModule = evaluateWidgetModuleExports(projectRoot, widget.clientSourcePath)
      const widgetFn = widgetModule?.default ?? widgetModule
      if (typeof widgetFn !== 'function') {
        throw new Error(
          `Expected the entry module at ${widget.clientSourcePath} to default-export a function or component.`
        )
      }

      const element = widgetFn({}, placeholderEnv)
      const json = renderAndroidVariantToJson(element)
      results.set(widget.id, new Map([[SINGLE_LOCALE_KEY, JSON.stringify(json)]]))
    } catch (error) {
      throw new Error(
        `Failed to prerender Dynamic Widget "${widget.id}": ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  logger.info(`Prerendered ${clientWidgets.length} Dynamic Android Widget placeholder(s)`)
  return results
}
