import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import type { AndroidPluginProps } from '../types'
import { validateAndroidWidgetConfig } from '../validation'
import { generateAndroidWidgetFiles } from './files'
import { configureAndroidManifest } from './manifest'

/**
 * Orchestrates Android widget file generation and AndroidManifest configuration.
 */
export const withAndroid: ConfigPlugin<AndroidPluginProps> = (config, props) => {
  const { enableNotifications, widgets, userImagesPath, fonts } = props

  if (!config.android?.package) {
    throw new Error(
      'Voltra Android config plugin requires expo.android.package to be set in app.json/app.config.* to configure Android widgets.'
    )
  }

  const projectRoot = (config as { modRequest?: { projectRoot?: string } }).modRequest?.projectRoot

  widgets.forEach((widget) => validateAndroidWidgetConfig(widget, projectRoot))

  return withPlugins(config, [
    [generateAndroidWidgetFiles, { widgets, userImagesPath, fonts }],
    [configureAndroidManifest, { enableNotifications, widgets }],
  ])
}
