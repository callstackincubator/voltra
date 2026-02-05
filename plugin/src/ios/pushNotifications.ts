import { ConfigPlugin, withEntitlementsPlist, withInfoPlist } from '@expo/config-plugins'

/**
 * Plugin that enables push notification support for Live Activities.
 *
 * This:
 * - Adds the aps-environment entitlement for push notifications
 * - Adds Voltra_EnablePushNotifications flag to Info.plist
 */
export const withPushNotifications: ConfigPlugin = (config) =>
  withInfoPlist(
    withEntitlementsPlist(config, (mod) => {
      // NOTE: For App Store builds, provisioning profiles typically inject 'production'.
      // This sets a default for debug/dev builds.
      mod.modResults['aps-environment'] = 'development'
      return mod
    }),
    (mod) => {
      mod.modResults['Voltra_EnablePushNotifications'] = true
      return mod
    }
  )
