/**
 * Shared entitlements utilities.
 */

/**
 * Adds application groups entitlement to an entitlements object.
 * Ensures the group list is deduped and preserves existing order.
 */
export function addApplicationGroupsEntitlement(
  entitlements: Record<string, any>,
  groupIdentifier: string
): Record<string, any> {
  const existingApplicationGroups = ((entitlements['com.apple.security.application-groups'] as string[]) ?? []).filter(
    Boolean
  )

  const deduped = Array.from(new Set(existingApplicationGroups))
  if (deduped.includes(groupIdentifier)) {
    entitlements['com.apple.security.application-groups'] = deduped
    return entitlements
  }

  entitlements['com.apple.security.application-groups'] = [...deduped, groupIdentifier]

  return entitlements
}
