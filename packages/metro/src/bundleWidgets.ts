import fs from 'node:fs'
import path from 'node:path'

import { createWidgetMetroConfig } from './createWidgetMetroConfig'
import { requireProjectModule } from './resolveProjectModule'
import { createWidgetRegistry, type RegisteredVoltraWidget } from './widgetRegistry'

export type BundleWidgetsOptions = {
  projectRoot: string
  outDir: string
  platform: string
}

type ParsedArgs = {
  outDir: string | null
  platform: string
  projectRoot: string
}

export function parseBundleWidgetsArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { outDir: null, platform: 'ios', projectRoot: process.cwd() }
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i + 1]
    switch (argv[i]) {
      case '--out-dir':
        args.outDir = value
        i += 1
        break
      case '--platform':
        args.platform = value
        i += 1
        break
      case '--project-root':
        args.projectRoot = path.resolve(value)
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

function widgetMatchesPlatform(widget: RegisteredVoltraWidget, projectRoot: string, platform: string): boolean {
  const segments = path.relative(projectRoot, widget.sourcePath).split(path.sep)
  if (segments.includes('android')) {
    return platform === 'android'
  }
  if (segments.includes('ios')) {
    return platform === 'ios'
  }
  return true
}

export async function bundleWidgets({ projectRoot, outDir, platform }: BundleWidgetsOptions): Promise<void> {
  if (!outDir) {
    throw new Error('bundleWidgets: --out-dir is required')
  }

  const Metro = requireProjectModule<{ runBuild(config: any, options: any): Promise<{ code: string }> }>(
    'metro',
    projectRoot
  )
  const appConfig = await loadAppMetroConfig(projectRoot)
  const widgetConfig = await createWidgetMetroConfig({ projectRoot, appConfig })
  const registry = createWidgetRegistry({ projectRoot })

  try {
    const widgets = Array.from(registry.listWidgets())
      .map((widget) => registry.getWidget(widget.id))
      .filter((widget): widget is RegisteredVoltraWidget => widget !== null)
      .filter((widget) => widgetMatchesPlatform(widget, projectRoot, platform))

    if (widgets.length === 0) {
      console.log(`[voltra] no client-rendered widgets to bundle for platform "${platform}"`)
      return
    }

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
  } finally {
    registry.close()
  }
}

export async function runBundleWidgetsCli(argv = process.argv): Promise<void> {
  const args = parseBundleWidgetsArgs(argv)
  await bundleWidgets({
    projectRoot: args.projectRoot,
    outDir: args.outDir ?? '',
    platform: args.platform,
  })
}
