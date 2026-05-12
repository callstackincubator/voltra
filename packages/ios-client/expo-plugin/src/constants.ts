import type { IOSWidgetFamily } from './types'

export const IOS = {
  DEPLOYMENT_TARGET: '17.0',
  SWIFT_VERSION: '5.0',
  DEVICE_FAMILY: '1,2',
  LAST_SWIFT_MIGRATION: 1250,
} as const

/** Default path for user-provided widget images */
export const DEFAULT_USER_IMAGES_PATH = './assets/voltra'

export const SUPPORTED_IMAGE_EXTENSIONS = /\.(png|jpg|jpeg)$/i

export const DEFAULT_WIDGET_FAMILIES: IOSWidgetFamily[] = ['systemSmall', 'systemMedium', 'systemLarge']

export const WIDGET_FAMILY_MAP: Record<IOSWidgetFamily, string> = {
  systemSmall: '.systemSmall',
  systemMedium: '.systemMedium',
  systemLarge: '.systemLarge',
  systemExtraLarge: '.systemExtraLarge',
  accessoryCircular: '.accessoryCircular',
  accessoryRectangular: '.accessoryRectangular',
  accessoryInline: '.accessoryInline',
}
