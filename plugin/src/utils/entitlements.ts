/**
 * Shared entitlement utility functions for iOS main app and widget extension.
 */

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
