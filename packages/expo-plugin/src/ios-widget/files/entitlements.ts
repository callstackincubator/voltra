import plist from '@expo/plist'
import * as fs from 'fs'
import * as path from 'path'

import { addApplicationGroupsEntitlement } from '../../utils/entitlements'
import { logger } from '../../utils/logger'

/**
 * Gets the entitlements for the widget extension.
 */
export function getWidgetExtensionEntitlements(groupIdentifier?: string, keychainGroup?: string): Record<string, any> {
  const entitlements: Record<string, any> = {}
  if (groupIdentifier) {
    addApplicationGroupsEntitlement(entitlements, groupIdentifier)
  }
  if (keychainGroup) {
    const existingGroups = ((entitlements['keychain-access-groups'] as string[]) ?? []).filter(Boolean)
    const deduped = Array.from(new Set(existingGroups))
    if (!deduped.includes(keychainGroup)) {
      deduped.push(keychainGroup)
    }
    entitlements['keychain-access-groups'] = deduped
  }
  return entitlements
}

export interface GenerateEntitlementsOptions {
  targetPath: string
  targetName: string
  groupIdentifier?: string
  keychainGroup?: string
}

/**
 * Generates the entitlements file for the widget extension.
 *
 * @param options - Generation options
 */
export function generateEntitlements(options: GenerateEntitlementsOptions): void {
  const { targetPath, targetName, groupIdentifier, keychainGroup } = options
  const filePath = path.join(targetPath, `${targetName}.entitlements`)

  const extensionEntitlements = getWidgetExtensionEntitlements(groupIdentifier, keychainGroup)

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, plist.build(extensionEntitlements))
  logger.info(`Generated ${targetName}.entitlements`)
}
