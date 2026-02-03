import plist from '@expo/plist'
import * as fs from 'fs'
import * as path from 'path'

import { logger } from '../../utils'
import { getWidgetExtensionEntitlements } from '../../utils/entitlements'

export interface GenerateEntitlementsOptions {
  targetPath: string
  targetName: string
  groupIdentifier?: string
}

/**
 * Generates the entitlements file for the widget extension.
 *
 * @param options - Generation options
 */
export function generateEntitlements(options: GenerateEntitlementsOptions): void {
  const { targetPath, targetName, groupIdentifier } = options
  const filePath = path.join(targetPath, `${targetName}.entitlements`)

  const extensionEntitlements = getWidgetExtensionEntitlements(groupIdentifier)

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, plist.build(extensionEntitlements))
  logger.info(`Generated ${targetName}.entitlements`)
}
