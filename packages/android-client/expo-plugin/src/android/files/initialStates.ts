import fs from 'fs'
import path from 'path'

import { logger, prerenderWidgetState, type PrerenderedWidgetStates } from '@use-voltra/expo-plugin'

import type { DetectedAndroidWidget } from '../clientRendered'
import { prerenderClientRenderedAndroidWidgets } from './clientRenderedPrerender'

/** Wrapped asset shape when multiple locales are built; matches Android reader in VoltraWidgetManager */
export const VOLTRA_LOCALIZED_INITIAL_STATE_KEY = '__voltraLocales'

export interface GenerateInitialStatesOptions {
  widgets: DetectedAndroidWidget[]
  projectRoot: string
  platformProjectRoot: string
}

type RenderAndroidWidgetToString = (variants: unknown) => string

/**
 * Generates the initial states JSON file for Android widgets.
 *
 * This file (voltra_initial_states.json) is placed in the Android assets directory
 * and contains the pre-rendered payloads for all widgets that have an initialStatePath.
 */
export async function generateAndroidInitialStates(options: GenerateInitialStatesOptions): Promise<void> {
  const { widgets, projectRoot, platformProjectRoot } = options

  // Dynamic import keeps the plugin CommonJS-compatible while resolving the current package entry.
  const androidServerModuleId = '@use-voltra/android/server'
  const { renderAndroidWidgetToString } = (await import(androidServerModuleId)) as {
    renderAndroidWidgetToString: RenderAndroidWidgetToString
  }

  // Widgets with `initialStatePath` prerender from `exports.default`. Dynamic Widgets instead
  // default-export a `(props, env) => JSX` function, so they're excluded here and prerendered
  // separately below — feeding a client file to the initial-state prerender would throw.
  const serverWidgets = widgets.filter((w) => !w.clientRendered)
  const prerenderedStates: PrerenderedWidgetStates = await prerenderWidgetState(
    serverWidgets,
    projectRoot,
    renderAndroidWidgetToString
  )

  // Single-node placeholders for Dynamic Widgets (first paint / offline fallback).
  const clientStates = await prerenderClientRenderedAndroidWidgets(widgets, projectRoot)
  for (const [id, perLocale] of clientStates.entries()) {
    prerenderedStates.set(id, perLocale)
  }

  if (prerenderedStates.size === 0) {
    return
  }

  // Create assets directory if it doesn't exist
  const assetsDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'assets')
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }

  // Convert Map to Object for JSON serialization (legacy flat shape vs localized wrapper)
  const statesObj: Record<string, unknown> = {}
  for (const [id, perLocale] of prerenderedStates.entries()) {
    try {
      if (perLocale.size === 1 && perLocale.has('__default')) {
        const raw = perLocale.get('__default')!
        statesObj[id] = JSON.parse(raw)
      } else {
        const locales: Record<string, unknown> = {}
        for (const [localeKey, jsonStr] of perLocale.entries()) {
          locales[localeKey] = JSON.parse(jsonStr)
        }
        statesObj[id] = { [VOLTRA_LOCALIZED_INITIAL_STATE_KEY]: locales }
      }
    } catch (e) {
      logger.warn(`Failed to parse prerendered state for widget ${id}: ${e}`)
    }
  }

  const outputFilePath = path.join(assetsDir, 'voltra_initial_states.json')
  fs.writeFileSync(outputFilePath, JSON.stringify(statesObj, null, 2))

  logger.info(`Generated voltra_initial_states.json with ${Object.keys(statesObj).length} pre-rendered widget states`)
}
