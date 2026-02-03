import type { ConfigPlugin } from '@expo/config-plugins'

import { addApplicationGroupsEntitlement } from '../utils/entitlements'

export interface ConfigureIOSMainAppEntitlementsProps {
  groupIdentifier: string
}

/**
 * Plugin that configures the iOS main app's entitlements.
 *
 * This:
 * - Adds application groups entitlement to the main app for shared data access
 */
export const configureIOSMainAppEntitlements: ConfigPlugin<ConfigureIOSMainAppEntitlementsProps> = (
  config,
  { groupIdentifier }
) => {
  config.ios = {
    ...config.ios,
    entitlements: {
      ...addApplicationGroupsEntitlement(config.ios?.entitlements ?? {}, groupIdentifier),
    },
  }

  return config
}
