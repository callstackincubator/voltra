import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'

import type { AndroidWidgetConfig } from '../../types'
import { generateAndroidAssets } from './assets'
import { generateAndroidInitialStates } from './initialStates'
import { generateWidgetReceivers } from './kotlin'
import { generateWidgetInfoFiles, generateWidgetPlaceholderLayouts, generateWidgetPreviewLayouts } from './xml'

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
      if (config.modRequest.introspect) {
        return config
      }

      const { platformProjectRoot, projectRoot } = config.modRequest
      const packageName = config.android?.package

      if (!packageName) {
        throw new Error(
          'Voltra config plugin requires expo.android.package to be set in app.json/app.config.* to configure Android widgets.'
        )
      }

      // Generate assets (drawable images and preview images)
      const previewImageMap = await generateAndroidAssets({
        platformProjectRoot,
        projectRoot,
        userImagesPath,
        widgets,
      })

      // Generate Kotlin receiver classes
      await generateWidgetReceivers({
        platformProjectRoot,
        packageName,
        widgets,
      })

      // Generate XML files (widget info, layouts, strings)
      await generateWidgetInfoFiles({
        platformProjectRoot,
        widgets,
      })

      await generateWidgetPlaceholderLayouts({
        platformProjectRoot,
      })

      await generateWidgetPreviewLayouts({
        platformProjectRoot,
        projectRoot,
        widgets,
        previewImageMap,
      })

      // Generate initial states (pre-rendered widgets)
      await generateAndroidInitialStates({
        platformProjectRoot,
        projectRoot: config.modRequest.projectRoot,
        widgets,
      })

      return config
    },
  ])
}
