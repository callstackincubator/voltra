const fs = require('node:fs')
const path = require('node:path')

const { createWidgetMetroConfig } = require('./createWidgetMetroConfig')
const { createWidgetRegistry } = require('./widgetRegistry')
const { requireProjectModule } = require('./resolveProjectModule')

// One-shot production bundler for client-rendered Voltra widgets. Builds each discovered
// 'use voltra' widget into a self-contained, minified JS bundle and writes it as
// `voltra-widget-<id>.bundle`. The native widget runtime reads these from its own bundle
// (Bundle.main) in release builds, where there is no Metro dev server to fetch from.
//
// Reuses the same widget Metro config the dev server uses, so the baked bundle has the
// identical module format (stripped polyfills, __d/__r) the native JSC evaluation expects —
// the only differences are dev:false and minification.
//
// Invoked from the widget extension's release-only "Bundle Voltra client widgets" build phase.
// Usage: node metro/bundleWidgets.js --out-dir <dir> [--platform ios] [--project-root <dir>]

function parseArgs(argv) {
  const args = { outDir: null, platform: 'ios', projectRoot: path.resolve(__dirname, '..') }
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

// Mirror createMetroConfig.js's app config preparation so the widget config resolves the same way.
function buildAppConfig(getDefaultConfig, projectRoot) {
  const appConfig = getDefaultConfig(projectRoot)
  appConfig.resolver.extraNodeModules = {
    ...appConfig.resolver.extraNodeModules,
    '~': projectRoot,
  }
  return appConfig
}

// A widget belongs to a platform when its source lives under `widgets/<platform>/`; widgets in
// neither directory are platform-agnostic and bundled for every platform.
function widgetMatchesPlatform(widget, platform) {
  const segments = widget.sourcePath.split('/')
  if (segments.includes('android')) {
    return platform === 'android'
  }
  if (segments.includes('ios')) {
    return platform === 'ios'
  }
  return true
}

async function bundleWidgets({ projectRoot, outDir, platform }) {
  if (!outDir) {
    throw new Error('bundleWidgets: --out-dir is required')
  }

  const Metro = requireProjectModule('metro', projectRoot)
  const { getDefaultConfig } = requireProjectModule('expo/metro-config', projectRoot)
  const appConfig = buildAppConfig(getDefaultConfig, projectRoot)
  const widgetConfig = await createWidgetMetroConfig({ projectRoot, appConfig })
  const registry = createWidgetRegistry({ projectRoot })

  try {
    const widgets = registry.listWidgets().filter((widget) => widgetMatchesPlatform(widget, platform))

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

bundleWidgets(parseArgs(process.argv))
  .then(() => {
    // Metro leaves worker/handle state that can keep the process alive; exit explicitly so the
    // build phase doesn't hang.
    process.exit(0)
  })
  .catch((error) => {
    console.error(`[voltra] widget bundling failed: ${error.stack || error.message}`)
    process.exit(1)
  })