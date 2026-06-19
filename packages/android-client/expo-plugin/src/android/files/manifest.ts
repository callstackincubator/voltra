import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

import { type DynamicWidgetManifest, logger } from '@use-voltra/expo-plugin'

import type { AndroidWidgetConfig } from '../../types'
import { validateAndroidWidgetConfig } from '../../validation'

const MANIFEST_PATH = path.join('.voltra', 'manifest.android.json')

export interface GenerateAndroidDynamicWidgetsManifestOptions {
  widgets?: AndroidWidgetConfig[]
}

export function createAndroidDynamicWidgetsManifest(
  projectRoot: string,
  widgets: AndroidWidgetConfig[]
): DynamicWidgetManifest {
  return {
    version: 1,
    platform: 'android',
    widgets: widgets.map((widget) => ({
      id: widget.id,
      entry: validateAndroidWidgetConfig(widget, projectRoot),
    })),
  }
}

export function writeAndroidDynamicWidgetsManifest(projectRoot: string, widgets: AndroidWidgetConfig[]): void {
  const manifestPath = path.join(projectRoot, MANIFEST_PATH)
  const manifest = createAndroidDynamicWidgetsManifest(projectRoot, widgets)

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  logger.info(`Generated ${MANIFEST_PATH}`)
}

/**
 * Writes the Android-owned Dynamic Widgets manifest during prebuild.
 */
export const generateAndroidDynamicWidgetsManifest: ConfigPlugin<GenerateAndroidDynamicWidgetsManifestOptions> = (
  config,
  props
) => {
  const { widgets } = props

  return withDangerousMod(config, [
    'android',
    async (config) => {
      if (config.modRequest.introspect) {
        return config
      }

      const { projectRoot } = config.modRequest
      if (!projectRoot) {
        throw new Error('Voltra Android manifest generation requires expo mod projectRoot to be set.')
      }

      writeAndroidDynamicWidgetsManifest(projectRoot, widgets ?? [])

      return config
    },
  ])
}
