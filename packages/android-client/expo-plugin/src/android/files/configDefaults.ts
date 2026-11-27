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
 *
 * Also emits `assets/voltra/widget_dynamic_parameters.json`, `{ "<widgetId>": ["<paramName>"] }`:
 * each widget's `dynamicOptions` parameters in declared order: the only parameters
 * resolved against stored choices, which read as `""` until the app sets them. Removed when nothing declares one.
 */
export async function generateAndroidConfigDefaults(options: GenerateConfigDefaultsOptions): Promise<void> {
  const { widgets, platformProjectRoot } = options

  const defaults: Record<string, Record<string, string>> = {}
  const dynamicParameters: Record<string, string[]> = {}
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
    const dynamicNames = params.filter((param) => param.dynamicOptions === true).map((param) => param.name)
    if (dynamicNames.length > 0) {
      dynamicParameters[widget.id] = dynamicNames
    }
  }

  const voltraAssetsDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'assets', 'voltra')
  const dynamicParametersPath = path.join(voltraAssetsDir, 'widget_dynamic_parameters.json')
  if (Object.keys(dynamicParameters).length > 0) {
    fs.mkdirSync(voltraAssetsDir, { recursive: true })
    fs.writeFileSync(dynamicParametersPath, JSON.stringify(dynamicParameters, null, 2))
  } else {
    // A stale list would keep blanking parameters the app no longer declares.
    fs.rmSync(dynamicParametersPath, { force: true })
  }

  if (Object.keys(defaults).length === 0) {
    return
  }

  fs.mkdirSync(voltraAssetsDir, { recursive: true })
  fs.writeFileSync(path.join(voltraAssetsDir, 'widget_config_defaults.json'), JSON.stringify(defaults, null, 2))

  logger.info(`Generated widget_config_defaults.json for ${Object.keys(defaults).length} widget(s)`)
}
