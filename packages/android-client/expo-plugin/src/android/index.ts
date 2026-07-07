import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import { detectClientRenderedWidgets } from './clientRendered'
import type { DetectedAndroidWidget } from './clientRendered'
import type { AndroidPluginProps } from '../types'
import { validateAndroidWidgetConfig } from '../validation'
import { generateAndroidWidgetFiles } from './files'
import { withWidgetBundleGradle } from './gradle'
import { configureAndroidManifest } from './manifest'

/**
 * Orchestrates Android widget file generation and AndroidManifest configuration.
 */
export const withAndroid: ConfigPlugin<AndroidPluginProps> = (config, props) => {
  const { enableNotifications, widgets, userImagesPath, fonts, scheme, widgetConfigurationRoute } = props

  if (!config.android?.package) {
    throw new Error(
      'Voltra Android config plugin requires expo.android.package to be set in app.json/app.config.* to configure Android widgets.'
    )
  }

  const projectRoot = (config as { modRequest?: { projectRoot?: string } }).modRequest?.projectRoot
  const detectedWidgets = projectRoot ? detectClientRenderedWidgets(widgets, projectRoot) : undefined
  const manifestWidgets: DetectedAndroidWidget[] =
    detectedWidgets ??
    widgets.map((widget) =>
      widget.entry === undefined
        ? { ...widget, clientRendered: false as const }
        : { ...widget, clientRendered: true as const, clientSourcePath: widget.entry }
    )

  widgets.forEach((widget) => validateAndroidWidgetConfig(widget, projectRoot))

  return withPlugins(config, [
    [generateAndroidWidgetFiles, { widgets, detectedWidgets, userImagesPath, fonts, scheme, widgetConfigurationRoute }],
    [configureAndroidManifest, { enableNotifications, widgets: manifestWidgets }],
    [withWidgetBundleGradle, { widgets }],
  ])
}
