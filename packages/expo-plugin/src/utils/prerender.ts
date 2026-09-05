import path from 'node:path'

import { createWidgetModuleLoader, type WidgetModuleLoader, type WidgetModulePlatform } from '@use-voltra/compiler'

import type { WidgetInitialStatePath, WidgetLabel } from '../types'
import { logger } from './logger'
import { isWidgetLocalizedMap } from './widgetLabel'

/**
 * Type for the widget renderer function
 */
export type WidgetRenderer = (variants: any) => string

/**
 * Minimal interface for widget configuration needed for prerendering
 */
export interface PrerenderableWidget {
  id: string
  initialStatePath?: WidgetInitialStatePath
}

/** widgetId -> locale key -> prerendered JSON string (single-file widgets use `__default`) */
export type PrerenderedWidgetStates = Map<string, Map<string, string>>

export interface WidgetModuleEvaluationOptions {
  projectRoot: string
  /** Platform being prebuilt. Determines `Platform.OS` inside widget code. */
  platform: WidgetModulePlatform
  /** Reuse a loader across several widgets so warnings are reported once per prebuild. */
  loader?: WidgetModuleLoader
}

/**
 * Create the loader used to evaluate widget source during prebuild.
 *
 * Evaluation rules live in `@use-voltra/compiler` so that prebuild, `voltra apply`, and
 * the Metro widget bundler agree on what widget code may import.
 */
export function createPrerenderWidgetModuleLoader(
  projectRoot: string,
  platform: WidgetModulePlatform
): WidgetModuleLoader {
  return createWidgetModuleLoader({
    projectRoot,
    platform,
    onWarning: (message) => logger.warn(message),
  })
}

function resolveLoader({ projectRoot, platform, loader }: WidgetModuleEvaluationOptions): WidgetModuleLoader {
  return loader ?? createPrerenderWidgetModuleLoader(projectRoot, platform)
}

/**
 * Evaluate a widget module and return its exports object.
 *
 * Exported so platform-specific prerender flows can reuse the same module loader rather
 * than duplicating the Babel + VM scaffolding. Callers decide whether to read `.default`,
 * a named export, etc.
 */
export function evaluateWidgetModuleExports(filePath: string, options: WidgetModuleEvaluationOptions): any {
  return resolveLoader(options).load(filePath)
}

/**
 * Evaluate a widget file as a server-style WidgetVariants module and return its object export.
 */
export function evaluateWidgetModule(filePath: string, options: WidgetModuleEvaluationOptions): any {
  const widgetVariants = resolveLoader(options).loadDefaultExport(filePath)

  if (!widgetVariants || typeof widgetVariants !== 'object') {
    throw new Error('Widget file must export a WidgetVariants object or have a default export of WidgetVariants')
  }

  return widgetVariants
}

/**
 * Prerender widget initial states for build-time inclusion.
 *
 * Widget code is transpiled with Babel and executed in a Node.js VM sandbox.
 * This function loads widget files that export WidgetVariants for widgets with initialStatePath configured,
 * renders them to JSON, and returns a map of prerendered states that can be bundled into the app.
 *
 * @param widgets - Array of widget configurations
 * @param projectRoot - Root directory of the Expo project
 * @param renderer - The renderer function to use (voltra/server or voltra/android/server)
 * @param platform - Platform being prebuilt
 * @returns Map of widgetId -> (locale key -> prerendered JSON string)
 */
export async function prerenderWidgetState(
  widgets: PrerenderableWidget[],
  projectRoot: string,
  renderer: WidgetRenderer,
  platform: WidgetModulePlatform
): Promise<PrerenderedWidgetStates> {
  const prerenderedStates: PrerenderedWidgetStates = new Map()
  const loader = createPrerenderWidgetModuleLoader(projectRoot, platform)

  for (const widget of widgets) {
    if (!widget.initialStatePath) {
      continue
    }

    const pathSpec = widget.initialStatePath
    const perLocalePaths: Record<string, string> = isWidgetLocalizedMap(pathSpec as WidgetLabel)
      ? (pathSpec as Record<string, string>)
      : { __default: pathSpec as string }

    const inner = new Map<string, string>()

    try {
      for (const [localeKey, relativePath] of Object.entries(perLocalePaths)) {
        const absoluteWidgetPath = path.resolve(projectRoot, relativePath)
        const widgetVariants = evaluateWidgetModule(absoluteWidgetPath, { projectRoot, platform, loader })
        const prerenderedState = renderer(widgetVariants)
        inner.set(localeKey, prerenderedState)
      }
      prerenderedStates.set(widget.id, inner)
    } catch (error) {
      throw new Error(
        `Failed to prerender widget state for ${widget.id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return prerenderedStates
}
