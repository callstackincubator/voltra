import plist from '@expo/plist'
import * as fs from 'fs'
import * as path from 'path'

import { logger } from '../../../utils'

/**
 * Adds application groups entitlement to an entitlements object.
 */
export function addApplicationGroupsEntitlement(
  entitlements: Record<string, any>,
  groupIdentifier: string
): Record<string, any> {
  const existingApplicationGroups = ((entitlements['com.apple.security.application-groups'] as string[]) ?? []).filter(
    Boolean
  )

  entitlements['com.apple.security.application-groups'] = [groupIdentifier, ...existingApplicationGroups]

  return entitlements
}

/**
 * Gets the entitlements for the widget extension.
 */
export function getWidgetExtensionEntitlements(groupIdentifier?: string): Record<string, any> {
  const entitlements: Record<string, any> = {}
  if (groupIdentifier) {
    addApplicationGroupsEntitlement(entitlements, groupIdentifier)
  }
  return entitlements
}

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
