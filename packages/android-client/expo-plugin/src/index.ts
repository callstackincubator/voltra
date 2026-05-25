import { withAndroid } from './android'
import type { AndroidConfigPluginProps, VoltraAndroidConfigPlugin } from './types'
import { validateAndroidConfigPluginProps } from './validation'

/**
 * Voltra Android Expo config plugin.
 *
 * Configures home screen widgets and optional notification manifest entries.
 */
const withVoltraAndroid: VoltraAndroidConfigPlugin = (config, props = {}) => {
  const projectRoot = (config as { modRequest?: { projectRoot?: string } }).modRequest?.projectRoot
  validateAndroidConfigPluginProps(props, projectRoot)

  const widgets = props.widgets ?? []
  if (widgets.length === 0 && !props.enableNotifications) {
    return config
  }

  return withAndroid(config, {
    enableNotifications: props.enableNotifications,
    widgets,
    ...(props.fonts ? { fonts: props.fonts } : {}),
  })
}

export default withVoltraAndroid

export type {
  AndroidConfigPluginProps,
  AndroidPluginProps,
  AndroidWidgetConfig,
  AndroidWidgetServerUpdateConfig,
  VoltraAndroidConfigPlugin,
} from './types'
