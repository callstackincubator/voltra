import { ConfigPlugin } from '@expo/config-plugins'

import { addApplicationGroupsEntitlement } from '../utils/entitlements'

export interface ConfigureEasProps {
  groupIdentifier?: string
}

/**
 * Configures main app for EAS builds.
 *
 * This adds the app group entitlement to the main app's entitlements
 * so that EAS can properly configure provisioning profiles.
 */
export const configureEas: ConfigPlugin<ConfigureEasProps> = (config, props = {}) => {
  if (!props.groupIdentifier) {
    // No group identifier provided, skip EAS configuration
    return config
  }

  // Ensure ios.entitlements exists in config for EAS to detect
  if (!config.ios) {
    config.ios = {}
  }
  if (!config.ios.entitlements) {
    config.ios.entitlements = {}
  }

  // Add app groups entitlement for EAS
  addApplicationGroupsEntitlement(config.ios.entitlements, props.groupIdentifier)

  return config
}
