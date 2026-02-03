import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'

import type { AndroidWidgetConfig } from '../../../types'
import { generateAndroidAssets } from './assets'
import { generateInitialStates } from './initialStates'
import { generateKotlinFiles } from './kotlin'
import { generateXmlFiles } from './xml'

export interface GenerateAndroidWidgetFilesProps {
  widgets: AndroidWidgetConfig[]
  userImagesPath?: string
}

/**
 * Plugin step that generates all Android widget files.
 *
 * This creates:
 * - Kotlin receiver classes for each widget
 * - res/xml/{widget_id}_info.xml (widget provider info)
 * - res/layout/voltra_widget_placeholder.xml (placeholder layout)
 * - res/values/voltra_widgets.xml (widget descriptions)
 * - res/drawable/ images (user images as drawable resources)
 *
 * This should run before configureAndroidManifest so the files exist when the manifest is configured.
 */
export const generateAndroidWidgetFiles: ConfigPlugin<GenerateAndroidWidgetFilesProps> = (config, props) => {
  const { widgets, userImagesPath } = props

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { platformProjectRoot, projectRoot } = config.modRequest
      const packageName = config.android?.package || 'com.example.app'

      // Generate assets (drawable images and preview images)
      const previewImageMap = await generateAndroidAssets({
        platformProjectRoot,
        projectRoot,
        userImagesPath,
        widgets,
      })

      // Generate Kotlin receiver classes
      await generateKotlinFiles({
        platformProjectRoot,
        packageName,
        widgets,
      })

      // Generate XML files (widget info, layouts, strings, preview layouts)
      await generateXmlFiles({
        platformProjectRoot,
        projectRoot,
        widgets,
        previewImageMap,
      })

      // Generate initial states (pre-rendered widgets)
      await generateInitialStates({
        platformProjectRoot,
        projectRoot: config.modRequest.projectRoot,
        widgets,
      })

      return config
    },
  ])
}
