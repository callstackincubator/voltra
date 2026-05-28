import type { IOSWidgetFamily } from './types'

export const DEFAULT_ANDROID_ENABLE_NOTIFICATIONS = false
export const DEFAULT_ANDROID_SERVER_UPDATE_INTERVAL_MINUTES = 60
export const DEFAULT_ANDROID_SERVER_UPDATE_REFRESH = false
export const DEFAULT_ANDROID_USER_IMAGES_PATH = './assets/voltra-android'

export const DEFAULT_IOS_ENABLE_PUSH_NOTIFICATIONS = false
export const DEFAULT_IOS_DEPLOYMENT_TARGET = '17.0'
export const DEFAULT_IOS_SERVER_UPDATE_INTERVAL_MINUTES = 15
export const DEFAULT_IOS_SERVER_UPDATE_REFRESH = false
export const DEFAULT_IOS_USER_IMAGES_PATH = './assets/voltra'
export const DEFAULT_IOS_WIDGET_FAMILIES: IOSWidgetFamily[] = ['systemSmall', 'systemMedium', 'systemLarge']

/**
 * These defaults intentionally mirror the existing Expo plugin behavior where that behavior is already explicit.
 * Some values, such as the default iOS widget target name, still depend on native project discovery and app naming.
 */
export const CLI_DEFAULTS = {
  android: {
    enableNotifications: DEFAULT_ANDROID_ENABLE_NOTIFICATIONS,
    serverUpdateIntervalMinutes: DEFAULT_ANDROID_SERVER_UPDATE_INTERVAL_MINUTES,
    serverUpdateRefresh: DEFAULT_ANDROID_SERVER_UPDATE_REFRESH,
    userImagesPath: DEFAULT_ANDROID_USER_IMAGES_PATH,
  },
  ios: {
    deploymentTarget: DEFAULT_IOS_DEPLOYMENT_TARGET,
    enablePushNotifications: DEFAULT_IOS_ENABLE_PUSH_NOTIFICATIONS,
    serverUpdateIntervalMinutes: DEFAULT_IOS_SERVER_UPDATE_INTERVAL_MINUTES,
    serverUpdateRefresh: DEFAULT_IOS_SERVER_UPDATE_REFRESH,
    userImagesPath: DEFAULT_IOS_USER_IMAGES_PATH,
    widgetFamilies: DEFAULT_IOS_WIDGET_FAMILIES,
  },
} as const
