import { ConfigPlugin } from '@expo/config-plugins'

/**
 * Supported widget size families
 */
export type WidgetFamily =
  | 'systemSmall'
  | 'systemMedium'
  | 'systemLarge'
  | 'systemExtraLarge'
  | 'accessoryCircular'
  | 'accessoryRectangular'
  | 'accessoryInline'

/**
 * Configuration for a single home screen widget
 */
export interface WidgetConfig {
  /**
   * Unique identifier for the widget (used as the widget kind and in JS API)
   * Must be alphanumeric with underscores only
   */
  id: string
  /**
   * Display name shown in the widget gallery
   */
  displayName: string
  /**
   * Description shown in the widget gallery
   */
  description: string
  /**
   * Supported widget sizes
   * @default ['systemSmall', 'systemMedium', 'systemLarge']
   */
  supportedFamilies?: WidgetFamily[]
}

interface ConfigPluginProps {
  enablePushNotifications?: boolean
  groupIdentifier?: string
  /**
   * Configuration for home screen widgets
   * Each widget will be available in the widget gallery
   */
  widgets?: WidgetConfig[]
}

export type VoltraConfigPlugin = ConfigPlugin<ConfigPluginProps | undefined>
