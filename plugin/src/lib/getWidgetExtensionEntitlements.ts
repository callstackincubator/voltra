import { ExportedConfig, InfoPlist } from '@expo/config-plugins'

interface Options {
  groupIdentifier?: string
}

export function getWidgetExtensionEntitlements(_iosConfig: ExportedConfig['ios'], options: Options | undefined = {}) {
  const entitlements: InfoPlist = {}
  addApplicationGroupsEntitlement(entitlements, options.groupIdentifier)
  return entitlements
}

export function addApplicationGroupsEntitlement(entitlements: InfoPlist, groupIdentifier?: string) {
  if (groupIdentifier) {
    const existingApplicationGroups = (
      (entitlements['com.apple.security.application-groups'] as string[]) ?? []
    ).filter(Boolean)

    entitlements['com.apple.security.application-groups'] = [groupIdentifier, ...existingApplicationGroups]
  }

  return entitlements
}
