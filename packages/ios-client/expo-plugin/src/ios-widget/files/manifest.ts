import * as fs from 'fs'
import * as path from 'path'

import {
  type DynamicLiveActivityManifest,
  type DynamicWidgetManifest,
  logger,
  validateWidgetEntry,
} from '@use-voltra/expo-plugin'

import type { IOSDynamicLiveActivityConfig, IOSWidgetConfig } from '../../types'

const MANIFEST_PATH = path.join('.voltra', 'manifest.ios.json')
const LIVE_ACTIVITIES_MANIFEST_PATH = path.join('.voltra', 'manifest.ios.live-activities.json')

export interface GenerateIOSDynamicWidgetsManifestOptions {
  projectRoot: string
  widgets?: IOSWidgetConfig[]
}

export interface GenerateIOSDynamicLiveActivitiesManifestOptions {
  projectRoot: string
  liveActivities?: IOSDynamicLiveActivityConfig[]
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

export function createIOSDynamicLiveActivitiesManifest(
  projectRoot: string,
  liveActivities: IOSDynamicLiveActivityConfig[]
): DynamicLiveActivityManifest {
  return {
    version: 1,
    platform: 'ios',
    liveActivities: [...liveActivities]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((liveActivity) => ({
        id: liveActivity.id,
        entry: validateWidgetEntry(liveActivity.entry, liveActivity.id, projectRoot),
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

/** Writes the dedicated Dynamic Live Activity manifest on every prebuild, including when empty. */
export function generateIOSDynamicLiveActivitiesManifest(
  options: GenerateIOSDynamicLiveActivitiesManifestOptions
): void {
  const { projectRoot, liveActivities } = options
  const manifestPath = path.join(projectRoot, LIVE_ACTIVITIES_MANIFEST_PATH)
  const manifest = createIOSDynamicLiveActivitiesManifest(projectRoot, liveActivities ?? [])

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  logger.info(`Generated ${LIVE_ACTIVITIES_MANIFEST_PATH}`)
}
