import * as fs from 'fs'
import * as path from 'path'

import type { WidgetConfig } from '../../../../types'
import { logger } from '../../../../utils'
import { generateInitialStatesSwift } from './initialStates'
import { prerenderWidgetState } from './prerender'
import { generateDefaultWidgetBundleSwift, generateWidgetBundleSwift } from './widgetBundle'

export interface GenerateSwiftFilesOptions {
  targetPath: string
  projectRoot: string
  widgets?: WidgetConfig[]
}

/**
 * Generates all Swift files for the widget extension.
 *
 * This creates:
 * - VoltraWidgetInitialStates.swift (pre-rendered widget states)
 * - VoltraWidgetBundle.swift (widget bundle definition)
 */
export async function generateSwiftFiles(options: GenerateSwiftFilesOptions): Promise<void> {
  const { targetPath, projectRoot, widgets } = options

  // Prerender widget initial states if any widgets have initialStatePath configured
  const prerenderedStates = await prerenderWidgetState(widgets || [], projectRoot)

  // Generate the initial states Swift file
  const initialStatesContent = generateInitialStatesSwift(prerenderedStates)
  const initialStatesPath = path.join(targetPath, 'VoltraWidgetInitialStates.swift')
  fs.writeFileSync(initialStatesPath, initialStatesContent)

  logger.info(`Generated VoltraWidgetInitialStates.swift with ${prerenderedStates.size} pre-rendered widget states`)

  // Generate the widget bundle Swift file
  const widgetBundleContent =
    widgets && widgets.length > 0 ? generateWidgetBundleSwift(widgets) : generateDefaultWidgetBundleSwift()

  const widgetBundlePath = path.join(targetPath, 'VoltraWidgetBundle.swift')
  fs.writeFileSync(widgetBundlePath, widgetBundleContent)

  logger.info(`Generated VoltraWidgetBundle.swift with ${widgets?.length ?? 0} home screen widgets`)
}
