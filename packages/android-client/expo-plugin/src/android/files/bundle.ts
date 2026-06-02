import { logger } from '@use-voltra/expo-plugin'
import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../types'

const VOLTRA_ASSETS_DIR = ['app', 'src', 'main', 'assets', 'voltra']
const BUNDLE_FILE_NAME = 'android-renderer.js'
const DEFAULTS_FILE_NAME = 'appintent_defaults.json'

interface CopyRendererBundleProps {
  platformProjectRoot: string
  projectRoot: string
  widgets: AndroidWidgetConfig[]
}

/**
 * Copy `@use-voltra/android-renderer`'s bundled JS into the Android assets
 * directory and emit a per-widget AppIntent defaults JSON, but only when any
 * widget declares `appIntent` (Track 4 PoC).
 *
 * Opt-in by design: widgets without `appIntent` don't ship either file, so the
 * resolver and its defaults aren't paid by apps that don't use reactive widgets.
 */
export async function copyAndroidRendererBundle({
  platformProjectRoot,
  projectRoot,
  widgets,
}: CopyRendererBundleProps): Promise<void> {
  const reactiveWidgets = widgets.filter((w) => w.appIntent)
  if (reactiveWidgets.length === 0) {
    return
  }

  const assetsDir = path.join(platformProjectRoot, ...VOLTRA_ASSETS_DIR)
  fs.mkdirSync(assetsDir, { recursive: true })

  // Copy bundled resolver JS
  const candidates = [
    path.join(projectRoot, 'node_modules', '@use-voltra', 'android-renderer', 'bundle', BUNDLE_FILE_NAME),
    path.join(projectRoot, '..', 'node_modules', '@use-voltra', 'android-renderer', 'bundle', BUNDLE_FILE_NAME),
    path.join(projectRoot, '..', 'packages', 'android-renderer', 'bundle', BUNDLE_FILE_NAME),
  ]

  const source = candidates.find((p) => fs.existsSync(p))
  if (!source) {
    logger.warn(
      'android-renderer.js not found — run `npm run build:bundle -w @use-voltra/android-renderer` then re-run prebuild'
    )
  } else {
    fs.copyFileSync(source, path.join(assetsDir, BUNDLE_FILE_NAME))
    logger.info(`Copied ${BUNDLE_FILE_NAME} to ${[...VOLTRA_ASSETS_DIR, BUNDLE_FILE_NAME].join('/')}`)
  }

  // Emit defaults JSON: { widgetId: { paramName: defaultValue } }
  const defaults: Record<string, Record<string, string>> = {}
  for (const widget of reactiveWidgets) {
    const widgetDefaults: Record<string, string> = {}
    for (const param of widget.appIntent?.parameters ?? []) {
      if (typeof param.default === 'string') {
        widgetDefaults[param.name] = param.default
      }
    }
    defaults[widget.id] = widgetDefaults
  }
  fs.writeFileSync(path.join(assetsDir, DEFAULTS_FILE_NAME), `${JSON.stringify(defaults, null, 2)}\n`)
  logger.info(`Wrote ${DEFAULTS_FILE_NAME} to ${[...VOLTRA_ASSETS_DIR, DEFAULTS_FILE_NAME].join('/')}`)
}
