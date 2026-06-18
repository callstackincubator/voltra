import * as fs from 'fs'
import * as path from 'path'

import { isWidgetLocalizedMap, type WidgetInitialStatePath } from '@use-voltra/expo-plugin'
import { scanVoltraDirectives } from '@use-voltra/compiler'

import type { AndroidWidgetConfig } from '../types'

/**
 * Client-rendered widget detection for Android — the counterpart of the iOS plugin's
 * clientRendered.ts.
 *
 * A widget is client-rendered when the file referenced by `initialStatePath` contains a
 * `'use voltra'` directive inside an exported function whose name equals the widget `id`. Such
 * widgets download a JS bundle and render on-device (Hermes) instead of consuming server JSON.
 *
 * The widget `id` must equal the exported function name (the id becomes both the Metro bundle
 * URL suffix and the widget's identity), so a mismatch fails loudly at prebuild.
 */

export type DetectedAndroidWidget =
  | (AndroidWidgetConfig & { clientRendered: false })
  | (AndroidWidgetConfig & {
      clientRendered: true
      clientComponentName: string
      clientSourcePath: string
    })

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
        `[voltra] Client-rendered widgets are EXPERIMENTAL (${clientWidgetIds.join(', ')}). ` +
          'The widget JSX runs on-device in a separate JS engine; the API and build output may change, ' +
          'and production rendering should be verified on a real device. Use at your own risk.'
      )
    }
  }

  return detected
}

function detectSingleWidget(widget: AndroidWidgetConfig, projectRoot: string): DetectedAndroidWidget {
  if (!widget.initialStatePath) {
    return { ...widget, clientRendered: false }
  }

  const sourcePath = resolveAnyInitialStatePath(widget.initialStatePath, projectRoot)
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ...widget, clientRendered: false }
  }

  const source = fs.readFileSync(sourcePath, 'utf8')

  // Cheap pre-check before paying for a Babel parse — same shortcut the Metro scanner uses.
  if (!source.includes("'use voltra'") && !source.includes('"use voltra"')) {
    return { ...widget, clientRendered: false }
  }

  const directiveWidgets = scanVoltraDirectives({ filePath: sourcePath, source })
  if (directiveWidgets.length === 0) {
    return { ...widget, clientRendered: false }
  }

  const directiveWidget = directiveWidgets.find((candidate) => candidate.id === widget.id)
  if (!directiveWidget) {
    const componentName = directiveWidgets[0].componentName
    throw new Error(
      `[voltra] Widget id mismatch: widget "${widget.id}" in app.json has initialStatePath ` +
        `pointing at ${path.relative(projectRoot, sourcePath)} but that file's 'use voltra' ` +
        `directive belongs to component "${componentName}". For client-rendered widgets the ` +
        `app.json id and the component name must match exactly (the id becomes the Metro bundle ` +
        `URL suffix).`
    )
  }

  return {
    ...widget,
    clientRendered: true,
    clientComponentName: directiveWidget.componentName,
    clientSourcePath: sourcePath,
  }
}

function resolveAnyInitialStatePath(spec: WidgetInitialStatePath, projectRoot: string): string | null {
  if (typeof spec === 'string') {
    return path.resolve(projectRoot, spec)
  }
  if (isWidgetLocalizedMap(spec)) {
    const firstPath = Object.values(spec).find(
      (value): value is string => typeof value === 'string' && value.length > 0
    )
    return firstPath ? path.resolve(projectRoot, firstPath) : null
  }
  return null
}
