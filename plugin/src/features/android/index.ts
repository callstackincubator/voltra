import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import type { AndroidPluginProps } from '../../types'
import { generateAndroidWidgetFiles } from './files'
import { configureAndroidManifest } from './manifest'

/**
 * Main Android configuration plugin.
 *
 * This orchestrates all Android-related configuration in the correct order:
 * 1. Generate widget files (Kotlin receivers, XML metadata, resources)
 * 2. Configure AndroidManifest (receiver entries)
 */
export const withAndroid: ConfigPlugin<AndroidPluginProps> = (config, props) => {
  const { widgets } = props

  return withPlugins(config, [
    // 1. Generate widget files (must run first so files exist)
    [generateAndroidWidgetFiles, { widgets }],

    // 2. Configure AndroidManifest (must run after files are generated)
    [configureAndroidManifest, { widgets }],
  ])
}
