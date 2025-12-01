import { ConfigPlugin } from '@expo/config-plugins'

interface ConfigPluginProps {
  enablePushNotifications?: boolean
  groupIdentifier?: string
}

export type VoltraConfigPlugin = ConfigPlugin<ConfigPluginProps | undefined>
