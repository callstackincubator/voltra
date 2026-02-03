import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import type { AndroidPluginProps } from '../../types'
import { validateAndroidWidgetConfig } from '../../validation/validateAndroidWidget'
import { generateAndroidWidgetFiles } from './files'
import { configureAndroidManifest } from './manifest'

/**
 * Main Android configuration plugin.
 *
 * This orchestrates all Android-related configuration in the correct order:
 * 1. Validate widget configurations with file existence checks
 * 2. Generate widget files (Kotlin receivers, XML metadata, resources)
 * 3. Configure AndroidManifest (receiver entries)
 */
export const withAndroid: ConfigPlugin<AndroidPluginProps> = (config, props) => {
  const { widgets, userImagesPath } = props

  // Get project root from modRequest if available, otherwise validation will skip file checks
  const projectRoot = (config as any).modRequest?.projectRoot

  // Validate Android widgets with file existence checks
  widgets.forEach((widget) => validateAndroidWidgetConfig(widget, projectRoot))

  return withPlugins(config, [
    // 1. Generate widget files (must run first so files exist)
    [generateAndroidWidgetFiles, { widgets, userImagesPath }],

    // 2. Configure AndroidManifest (must run after files are generated)
    [configureAndroidManifest, { widgets }],
  ])
}
