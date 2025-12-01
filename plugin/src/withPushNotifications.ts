import { ConfigPlugin, withEntitlementsPlist, withInfoPlist } from '@expo/config-plugins'

export const withPushNotifications: ConfigPlugin = (config) =>
  withInfoPlist(
    withEntitlementsPlist(config, (mod) => {
      // NOTE: For App Store builds, provisioning profiles typically inject 'production'.
      // This sets a default for debug/dev builds.
      mod.modResults['aps-environment'] = 'development'
      return mod
    }),
    (mod) => {
      mod.modResults['VoltraUI_EnablePushNotifications'] = true
      return mod
    }
  )
