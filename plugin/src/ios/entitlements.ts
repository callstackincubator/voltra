import { ConfigPlugin } from '@expo/config-plugins'

import { addApplicationGroupsEntitlement } from '../utils/entitlements'

export interface ConfigureEntitlementsProps {
  groupIdentifier?: string
  keychainGroup?: string
}

/**
 * Configures main app entitlements for app groups and keychain sharing.
 *
 * This adds:
 * - com.apple.security.application-groups entitlement for data sharing
 * - keychain-access-groups entitlement for shared credential access (if keychainGroup provided)
 */
export const configureEntitlements: ConfigPlugin<ConfigureEntitlementsProps> = (config, props = {}) => {
  if (!props.groupIdentifier && !props.keychainGroup) {
    // Nothing to configure
    return config
  }

  if (!config.ios) {
    config.ios = {}
  }
  if (!config.ios.entitlements) {
    config.ios.entitlements = {}
  }

  if (props.groupIdentifier) {
    addApplicationGroupsEntitlement(config.ios.entitlements, props.groupIdentifier)
  }

  if (props.keychainGroup) {
    addKeychainAccessGroupEntitlement(config.ios.entitlements, props.keychainGroup)
  }

  return config
}

/**
 * Adds keychain-access-groups entitlement to an entitlements object.
 * Ensures the group list is deduped and preserves existing order.
 */
function addKeychainAccessGroupEntitlement(
  entitlements: Record<string, any>,
  keychainGroup: string
): Record<string, any> {
  const existingGroups = ((entitlements['keychain-access-groups'] as string[]) ?? []).filter(Boolean)
  const deduped = Array.from(new Set(existingGroups))

  if (deduped.includes(keychainGroup)) {
    entitlements['keychain-access-groups'] = deduped
    return entitlements
  }

  entitlements['keychain-access-groups'] = [...deduped, keychainGroup]
  return entitlements
}
