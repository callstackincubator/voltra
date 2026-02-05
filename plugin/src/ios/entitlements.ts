import { ConfigPlugin } from '@expo/config-plugins'

import { addApplicationGroupsEntitlement } from '../utils/entitlements'

export interface ConfigureEntitlementsProps {
  groupIdentifier?: string
}

/**
 * Configures main app entitlements for app groups.
 *
 * This adds the com.apple.security.application-groups entitlement
 * to allow sharing data between the main app and widget extension.
 */
export const configureEntitlements: ConfigPlugin<ConfigureEntitlementsProps> = (config, props = {}) => {
  if (!props.groupIdentifier) {
    // No group identifier provided, skip entitlements configuration
    return config
  }

  if (!config.ios) {
    config.ios = {}
  }
  if (!config.ios.entitlements) {
    config.ios.entitlements = {}
  }

  addApplicationGroupsEntitlement(config.ios.entitlements, props.groupIdentifier)

  return config
}
