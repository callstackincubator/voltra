import * as fs from 'fs'
import * as path from 'path'

import { isWidgetLocalizedMap, type WidgetInitialStatePath } from '@use-voltra/expo-plugin'
import { scanVoltraDirectives } from '@use-voltra/compiler'

import type { IOSWidgetConfig } from '../types'

/**
 * Client-rendered widget detection.
 *
 * Voltra supports two widget rendering paths:
 *
 *  - **Server-rendered** (the original path): the host app pushes JSON state to the widget
 *    extension over IPC; the widget extension renders Voltra primitives from that JSON.
 *  - **Client-rendered**: the widget extension downloads a JS bundle from Metro (dev) or
 *    reads a baked bundle (prod), evaluates it in JSC, and calls a `(props, env) => JSX`
 *    function on every render. The app.json schema is unified between the two — client-rendered
 *    widgets are detected **implicitly** by inspecting the JSX file referenced by
 *    `initialStatePath` for a `'use voltra'` directive (Babel's "use strict"-style directive
 *    prologue) inside an exported function whose identifier matches the widget's `id`.
 *
 * The widget `id` in app.json **must** equal the JSX component name. If `'use voltra'` is
 * present but no exported function with that exact name exists, the plugin fails loudly at
 * prebuild — a silent fallback would let drift between the Metro bundle URL (uses the
 * component name) and Swift's `kind` string (uses the app.json id).
 *
 * Footgun: removing `'use voltra'` from the JSX silently switches the widget back to
 * server-rendered mode. A future improvement would be an explicit
 * `renderMode: 'server' | 'client'` flag.
 */

/**
 * Widget config augmented with the prebuild-time derived rendering mode.
 *
 * `clientRendered: false` is exactly the existing path (no behavior change for server widgets).
 * `clientRendered: true` adds `clientComponentName` (always equal to `id` per id-matching
 * validation) and `clientSourcePath` (absolute path to the JSX file, used by the prerender
 * step and by the generated Swift Provider's Metro URL — its `<id>.bundle` suffix is the
 * same as the component name).
 */
export type DetectedIOSWidget =
  | (IOSWidgetConfig & { clientRendered: false })
  | (IOSWidgetConfig & {
      clientRendered: true
      clientComponentName: string
      clientSourcePath: string
    })

// Emit the experimental notice at most once per prebuild process (detection runs from several
// plugin steps).
let hasWarnedExperimental = false

/**
 * Inspect every widget's `initialStatePath` source file once and tag each entry as either
 * server- or client-rendered. Throws on mismatch between `'use voltra'`-tagged component
 * name and widget `id`.
 */
export function detectClientRenderedWidgets(widgets: IOSWidgetConfig[], projectRoot: string): DetectedIOSWidget[] {
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

function detectSingleWidget(widget: IOSWidgetConfig, projectRoot: string): DetectedIOSWidget {
  if (!widget.initialStatePath) {
    return { ...widget, clientRendered: false }
  }

  const sourcePath = resolveAnyInitialStatePath(widget.initialStatePath, projectRoot)
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ...widget, clientRendered: false }
  }

  const source = fs.readFileSync(sourcePath, 'utf8')

  // Cheap pre-check — Babel parsing is not free, and the directive's literal string is
  // tiny and unambiguous. Same shortcut the Metro scanner uses
  // (example/metro/scanVoltraDirectives.js).
  if (!source.includes("'use voltra'") && !source.includes('"use voltra"')) {
    return { ...widget, clientRendered: false }
  }

  const directiveWidgets = scanVoltraDirectives({ filePath: sourcePath, source })
  if (directiveWidgets.length === 0) {
    // Directive string is present somewhere (comment, embedded literal), but no exported
    // function carries it as a directive. Treat as server-rendered; if the user meant
    // client-rendered they'll notice when the widget keeps using server payloads.
    return { ...widget, clientRendered: false }
  }

  const directiveWidget = directiveWidgets.find((candidate) => candidate.id === widget.id)
  if (!directiveWidget) {
    const componentName = directiveWidgets[0].componentName
    throw new Error(
      `[voltra] Widget id mismatch: widget "${widget.id}" in app.json has initialStatePath ` +
        `pointing at ${path.relative(projectRoot, sourcePath)} but that file's 'use voltra' ` +
        `directive belongs to component "${componentName}". For client-rendered widgets the ` +
        `app.json id and the JSX component name must match exactly (the id becomes both the ` +
        `Metro bundle URL suffix and the WidgetKit "kind" string — they cannot diverge).`
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
