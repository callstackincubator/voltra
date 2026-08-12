import fs from 'node:fs'
import path from 'node:path'

import type { DynamicWidgetPlatform } from '@use-voltra/expo-plugin'

import { createWidgetMetroConfig } from './createWidgetMetroConfig'
import { requireProjectModule } from './resolveProjectModule'
import { createWidgetRegistry } from './widgetRegistry'
import {
  createLiveActivityRegistry,
  MissingVoltraLiveActivitiesManifestError,
  type RegisteredVoltraLiveActivity,
} from './liveActivityRegistry'

export type BundleWidgetsOptions = {
  projectRoot: string
  outDir: string
  platform: DynamicWidgetPlatform
  /** Select bundles for a product target. The extension needs both; the app only needs activities. */
  content?: 'widgets' | 'live-activities' | 'all'
}

type ParsedArgs = {
  content: 'widgets' | 'live-activities' | 'all'
  outDir: string | null
  platform: DynamicWidgetPlatform
  projectRoot: string
}

function parsePlatform(value: string | undefined): DynamicWidgetPlatform {
  if (value === 'ios' || value === 'android') {
    return value
  }

  throw new Error(`Invalid platform '${value}'. Expected 'ios' or 'android'.`)
}

export function parseBundleWidgetsArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { content: 'all', outDir: null, platform: 'ios', projectRoot: process.cwd() }
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i + 1]
    switch (argv[i]) {
      case '--out-dir':
        args.outDir = value
        i += 1
        break
      case '--platform':
        args.platform = parsePlatform(value)
        i += 1
        break
      case '--project-root':
        args.projectRoot = path.resolve(value)
        i += 1
        break
      case '--content':
        if (value !== 'widgets' && value !== 'live-activities' && value !== 'all') {
          throw new Error(`Invalid content '${value}'. Expected widgets, live-activities, or all.`)
        }
        args.content = value
        i += 1
        break
      default:
        break
    }
  }
  return args
}

async function loadAppMetroConfig(projectRoot: string): Promise<any> {
  const { loadConfig } = requireProjectModule<{ loadConfig(argv?: any): Promise<any> }>('metro-config', projectRoot)
  return loadConfig({ cwd: projectRoot })
}

export async function bundleWidgets({
  projectRoot,
  outDir,
  platform,
  content = 'all',
}: BundleWidgetsOptions): Promise<void> {
  if (!outDir) {
    throw new Error('bundleWidgets: --out-dir is required')
  }

  const registry = createWidgetRegistry({ projectRoot })
  const liveActivityRegistry = platform === 'ios' ? createLiveActivityRegistry({ projectRoot }) : null

  try {
    const widgets = content === 'live-activities' ? [] : registry.listWidgets(platform)
    let liveActivities: RegisteredVoltraLiveActivity[] = []
    if (liveActivityRegistry && content !== 'widgets') {
      try {
        liveActivities = liveActivityRegistry.listLiveActivities()
      } catch (error) {
        if (!(error instanceof MissingVoltraLiveActivitiesManifestError)) throw error
      }
    }

    if (widgets.length === 0 && liveActivities.length === 0) {
      console.log(`[voltra] no Dynamic Widgets or Dynamic Live Activities to bundle for platform "${platform}"`)
      return
    }

    const Metro = requireProjectModule<{ runBuild(config: any, options: any): Promise<{ code: string }> }>(
      'metro',
      projectRoot
    )
    const appConfig = await loadAppMetroConfig(projectRoot)
    const widgetConfig = await createWidgetMetroConfig({ projectRoot, appConfig })

    fs.mkdirSync(outDir, { recursive: true })

    for (const widget of widgets) {
      const entry = path.resolve(projectRoot, widget.generatedEntryRelativePath)
      const { code } = await Metro.runBuild(widgetConfig, {
        entry,
        platform,
        dev: false,
        minify: true,
      })

      const outPath = path.join(outDir, `voltra-widget-${widget.id}.bundle`)
      fs.writeFileSync(outPath, code)
      console.log(`[voltra] baked ${path.basename(outPath)} (${code.length} bytes)`)
    }
    for (const liveActivity of liveActivities) {
      const entry = path.resolve(projectRoot, liveActivity.generatedEntryRelativePath)
      const { code } = await Metro.runBuild(widgetConfig, { entry, platform, dev: false, minify: true })
      const outPath = path.join(outDir, `voltra-live-activity-${liveActivity.id}.bundle`)
      fs.writeFileSync(outPath, code)
      console.log(`[voltra] baked ${path.basename(outPath)} (${code.length} bytes)`)
    }
  } finally {
    registry.close()
    liveActivityRegistry?.close()
  }
}

export async function runBundleWidgetsCli(argv = process.argv): Promise<void> {
  const args = parseBundleWidgetsArgs(argv)
  await bundleWidgets({
    projectRoot: args.projectRoot,
    outDir: args.outDir ?? '',
    platform: args.platform,
    content: args.content,
  })
}
