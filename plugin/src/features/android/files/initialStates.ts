import fs from 'fs'
import path from 'path'
import { renderAndroidWidgetToString } from 'voltra/android/server'

import type { AndroidWidgetConfig } from '../../../types'
import { logger } from '../../../utils'
import { prerenderWidgetState } from '../../../utils/prerender'

export interface GenerateInitialStatesOptions {
  widgets: AndroidWidgetConfig[]
  projectRoot: string
  platformProjectRoot: string
}

/**
 * Generates the initial states JSON file for Android widgets.
 *
 * This file (voltra_initial_states.json) is placed in the Android assets directory
 * and contains the pre-rendered payloads for all widgets that have an initialStatePath.
 */
export async function generateInitialStates(options: GenerateInitialStatesOptions): Promise<void> {
  const { widgets, projectRoot, platformProjectRoot } = options

  // Prerender widget states
  const prerenderedStates = await prerenderWidgetState(widgets, projectRoot, renderAndroidWidgetToString)

  if (prerenderedStates.size === 0) {
    return
  }

  // Create assets directory if it doesn't exist
  const assetsDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'assets')
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }

  // Convert Map to Object for JSON serialization
  const statesObj: Record<string, any> = {}
  for (const [id, stateJson] of prerenderedStates.entries()) {
    try {
      // Parse the JSON string so it's embedded as an object in the final JSON
      statesObj[id] = JSON.parse(stateJson)
    } catch (e) {
      logger.warn(`Failed to parse prerendered state for widget ${id}: ${e}`)
      // If it's not valid JSON, we might skip it or include it as string?
      // renderWidgetToString should return valid JSON.
    }
  }

  const outputFilePath = path.join(assetsDir, 'voltra_initial_states.json')
  fs.writeFileSync(outputFilePath, JSON.stringify(statesObj, null, 2))

  logger.info(`Generated voltra_initial_states.json with ${Object.keys(statesObj).length} pre-rendered widget states`)
}
