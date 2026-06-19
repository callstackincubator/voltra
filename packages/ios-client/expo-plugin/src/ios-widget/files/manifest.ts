import * as fs from 'fs'
import * as path from 'path'

import { type DynamicWidgetManifest, logger, validateWidgetEntry } from '@use-voltra/expo-plugin'

import type { IOSWidgetConfig } from '../../types'

const MANIFEST_PATH = path.join('.voltra', 'manifest.ios.json')

export interface GenerateIOSDynamicWidgetsManifestOptions {
  projectRoot: string
  widgets?: IOSWidgetConfig[]
}

export function createIOSDynamicWidgetsManifest(
  projectRoot: string,
  widgets: IOSWidgetConfig[]
): DynamicWidgetManifest {
  return {
    version: 1,
    platform: 'ios',
    widgets: widgets.map((widget) => ({
      id: widget.id,
      entry: validateWidgetEntry(widget.entry, widget.id, projectRoot),
    })),
  }
}

export function generateIOSDynamicWidgetsManifest(options: GenerateIOSDynamicWidgetsManifestOptions): void {
  const { projectRoot, widgets } = options
  const manifestPath = path.join(projectRoot, MANIFEST_PATH)
  const manifest = createIOSDynamicWidgetsManifest(projectRoot, widgets ?? [])

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  logger.info(`Generated ${MANIFEST_PATH}`)
}
