import fs from 'fs'
import path from 'path'

import { logger } from '@use-voltra/expo-plugin'

import type { AndroidWidgetConfig } from '../../types'
import { resolveAndroidWidgetServerUpdate } from '../serverUpdate'

export interface GenerateServerDefaultsOptions {
  widgets: AndroidWidgetConfig[]
  platformProjectRoot: string
}

/** `serverUpdate` defaults as the Kotlin side reads them, keyed by widget id. */
export interface AndroidWidgetServerDefaults {
  url?: string
  intervalMinutes: number
  refresh: boolean
}

/**
 * Emits `assets/voltra/widget_server_defaults.json`, the lowest layer of the settings stack read
 * at runtime by `voltra.widget.server`.
 *
 * These values used to be inlined into each generated receiver as Kotlin literals. They live in an
 * asset now because the app can override the URL and the interval at runtime with
 * `setWidgetServerUpdate`, and a receiver compiled at build time cannot be asked what the interval
 * is today.
 *
 * A widget id present in this file is server-driven. `url` is omitted when app.json declared
 * `serverUpdate` without one, which means the app supplies it at runtime.
 */
export async function generateAndroidServerDefaults(options: GenerateServerDefaultsOptions): Promise<void> {
  const { widgets, platformProjectRoot } = options
  const defaults = createAndroidWidgetServerDefaults(widgets)
  const assetsDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'assets', 'voltra')
  const assetPath = path.join(assetsDir, 'widget_server_defaults.json')

  if (Object.keys(defaults).length === 0) {
    // A project that removed its last server-driven widget must not keep an asset saying otherwise.
    fs.rmSync(assetPath, { force: true })
    return
  }

  fs.mkdirSync(assetsDir, { recursive: true })
  fs.writeFileSync(assetPath, `${JSON.stringify(defaults, null, 2)}\n`)

  logger.info(`Generated widget_server_defaults.json for ${Object.keys(defaults).length} widget(s)`)
}

export function createAndroidWidgetServerDefaults(
  widgets: Pick<AndroidWidgetConfig, 'id' | 'entry' | 'serverUpdate'>[]
): Record<string, AndroidWidgetServerDefaults> {
  const defaults: Record<string, AndroidWidgetServerDefaults> = {}

  for (const widget of widgets) {
    const serverUpdate = resolveAndroidWidgetServerUpdate(widget)

    if (!serverUpdate) {
      continue
    }

    defaults[widget.id] = {
      ...(serverUpdate.url !== undefined ? { url: serverUpdate.url } : {}),
      intervalMinutes: serverUpdate.intervalMinutes,
      refresh: serverUpdate.refresh,
    }
  }

  return defaults
}
