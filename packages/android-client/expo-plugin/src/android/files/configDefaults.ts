import fs from 'fs'
import path from 'path'

import { logger } from '@use-voltra/expo-plugin'

import type { AndroidWidgetConfig } from '../../types'

export interface GenerateConfigDefaultsOptions {
  widgets: AndroidWidgetConfig[]
  platformProjectRoot: string
}

/**
 * Emits the code-declared widget configuration defaults to
 * `assets/voltra/widget_config_defaults.json`, read at render time by VoltraConfigurationStore and
 * surfaced as `env.configuration` before the user configures anything (the Android equivalent of
 * iOS's `@Parameter(default:)`).
 *
 * Shape: `{ "<widgetId>": { "<paramName>": "<default>" } }`. Only parameters that declare a
 * `default` are emitted. No file is written when nothing declares defaults.
 */
export async function generateAndroidConfigDefaults(options: GenerateConfigDefaultsOptions): Promise<void> {
  const { widgets, platformProjectRoot } = options

  const defaults: Record<string, Record<string, string>> = {}
  for (const widget of widgets) {
    const params = widget.appIntent?.parameters ?? []
    const widgetDefaults: Record<string, string> = {}
    for (const param of params) {
      if (typeof param.default === 'string') {
        widgetDefaults[param.name] = param.default
      }
    }
    if (Object.keys(widgetDefaults).length > 0) {
      defaults[widget.id] = widgetDefaults
    }
  }

  if (Object.keys(defaults).length === 0) {
    return
  }

  const voltraAssetsDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'assets', 'voltra')
  fs.mkdirSync(voltraAssetsDir, { recursive: true })
  fs.writeFileSync(path.join(voltraAssetsDir, 'widget_config_defaults.json'), JSON.stringify(defaults, null, 2))

  logger.info(`Generated widget_config_defaults.json for ${Object.keys(defaults).length} widget(s)`)
}
