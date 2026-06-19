import * as fs from 'fs'
import * as path from 'path'

import { evaluateWidgetModuleExports } from '@use-voltra/expo-plugin'

import type { AndroidWidgetConfig } from '../types'

/**
 * Dynamic Widget detection for Android — the counterpart of the iOS plugin's
 * clientRendered.ts.
 *
 * Widgets without `entry` remain server-rendered/server-updated legacy widgets.
 * A widget is client-rendered when the module referenced by `entry` default-exports a function
 * or component. Such widgets download a JS bundle and render on-device (Hermes) instead of
 * consuming server JSON.
 */

export type DetectedAndroidWidget =
  | (AndroidWidgetConfig & { clientRendered: false })
  | (AndroidWidgetConfig & { clientRendered: true; clientSourcePath: string })

// Emit the experimental notice at most once per prebuild process (detection runs from several
// plugin steps).
let hasWarnedExperimental = false

export function detectClientRenderedWidgets(
  widgets: AndroidWidgetConfig[],
  projectRoot: string
): DetectedAndroidWidget[] {
  const detected = widgets.map((widget) => detectSingleWidget(widget, projectRoot))

  if (!hasWarnedExperimental) {
    const clientWidgetIds = detected.filter((widget) => widget.clientRendered).map((widget) => widget.id)
    if (clientWidgetIds.length > 0) {
      hasWarnedExperimental = true
      console.warn(
        `[voltra] Dynamic Widgets are EXPERIMENTAL (${clientWidgetIds.join(', ')}). ` +
          'The widget JSX runs on-device in a separate JS engine; the API and build output may change, ' +
          'and production rendering should be verified on a real device. Use at your own risk.'
      )
    }
  }

  return detected
}

function detectSingleWidget(widget: AndroidWidgetConfig, projectRoot: string): DetectedAndroidWidget {
  if (widget.entry === undefined) {
    return {
      ...widget,
      clientRendered: false,
    }
  }

  const sourcePath = resolveWidgetEntryPath(widget.entry, projectRoot)
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error(
      `[voltra] Dynamic Widget "${widget.id}" entry not found at ${path.relative(
        projectRoot,
        sourcePath ?? widget.entry
      )}`
    )
  }

  const widgetModule = evaluateWidgetModuleExports(projectRoot, sourcePath)
  const widgetFn = widgetModule?.default ?? widgetModule
  if (typeof widgetFn !== 'function') {
    throw new Error(
      `[voltra] Dynamic Widget "${widget.id}" at ${path.relative(
        projectRoot,
        sourcePath
      )} must default-export a function or component.`
    )
  }

  return {
    ...widget,
    clientRendered: true,
    clientSourcePath: sourcePath,
  }
}

function resolveWidgetEntryPath(entry: string, projectRoot: string): string | null {
  return path.resolve(projectRoot, entry)
}
