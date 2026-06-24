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
  const manifestWidgets: DynamicWidgetManifest['widgets'] = []

  for (const widget of widgets) {
    if (widget.entry === undefined) {
      continue
    }

    manifestWidgets.push({
      id: widget.id,
      entry: validateWidgetEntry(widget.entry, widget.id, projectRoot),
    })
  }

  return {
    version: 1,
    platform: 'ios',
    widgets: manifestWidgets,
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
