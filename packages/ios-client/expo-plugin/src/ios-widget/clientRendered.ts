import * as fs from 'fs'
import * as path from 'path'

import { evaluateWidgetModuleExports } from '@use-voltra/expo-plugin'

import type { IOSWidgetConfig } from '../types'

/**
 * Dynamic Widget detection.
 *
 * Dynamic Widgets are detected from the module referenced by `entry`.
 * A widget is treated as dynamic when its entry module default-exports a function or
 * component. The widget id is independent from the exported symbol name.
 */

/**
 * Widget config augmented with the prebuild-time derived rendering mode.
 *
 * `clientRendered: false` is the existing server-rendered path.
 * `clientRendered: true` adds `clientSourcePath` (absolute path to the Dynamic Widget entry,
 * used by the prerender step and by the generated Swift Provider's Metro URL).
 */
export type DetectedIOSWidget =
  | (IOSWidgetConfig & { clientRendered: false })
  | (IOSWidgetConfig & { clientRendered: true; clientSourcePath: string })

// Emit the experimental notice at most once per prebuild process (detection runs from several
// plugin steps).
let hasWarnedExperimental = false

/** Inspect every widget's `entry` module once and tag each entry as server- or client-rendered. */
export function detectClientRenderedWidgets(widgets: IOSWidgetConfig[], projectRoot: string): DetectedIOSWidget[] {
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

function detectSingleWidget(widget: IOSWidgetConfig, projectRoot: string): DetectedIOSWidget {
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
