#!/usr/bin/env node
// Phase 0 fixture builder — Track 5 (client-rendered widgets) on Android.
//
// Produces a single Android widget bundle for the standalone-Hermes smoke test
// (VoltraClientSmokeTest.kt), using the SAME serialization the production widget Metro
// config uses (no RN preamble / no polyfills, `react-native` import blocked). That faithful
// serialization is exactly what makes the bundle runnable in a bare Hermes runtime.
//
// We replicate `createWidgetMetroConfig.js` inline rather than requiring it, because that
// file's top-level `require('metro-config')` only resolves under `expo start`'s module
// resolution — here we resolve metro/metro-config explicitly via Expo's bundled copies.
//
// Output: example/android/app/src/main/assets/voltra/smoke-widget.bundle
// Run:    node example/metro/buildSmokeBundle.cjs

const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..') // example/
const repoRoot = path.resolve(projectRoot, '..')

// Resolve metro + metro-config via Expo's bundled copies (pnpm strict layout).
const expoMetroConfigEntry = require.resolve('expo/metro-config', { paths: [projectRoot] })
const resolveBase = [path.dirname(expoMetroConfigEntry), projectRoot]
const Metro = require(require.resolve('metro', { paths: resolveBase }))
const { getDefaultConfig: metroGetDefaultConfig } = require(require.resolve('metro-config', { paths: resolveBase }))
const { getDefaultConfig: expoGetDefaultConfig } = require(expoMetroConfigEntry)

const WIDGET_ID = 'SmokeClientWidget'

const linkedPackages = {
  '@use-voltra/android': path.join(repoRoot, 'packages/android'),
  '@use-voltra/android-client': path.join(repoRoot, 'packages/android-client'),
  '@use-voltra/core': path.join(repoRoot, 'packages/core'),
  '@use-voltra/expo-plugin': path.join(repoRoot, 'packages/expo-plugin'),
  '@use-voltra/ios': path.join(repoRoot, 'packages/ios'),
  '@use-voltra/ios-client': path.join(repoRoot, 'packages/ios-client'),
  '@use-voltra/server': path.join(repoRoot, 'packages/server'),
}

const blockedModules = new Set(['react-native'])

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)))
}

function resolvePnpmTransitive(name) {
  try {
    return path.dirname(require.resolve(`${name}/package.json`, { paths: [repoRoot] }))
  } catch {
    // pnpm doesn't hoist transitives to the top-level node_modules, so the direct resolve
    // above fails. Fall back to scanning the virtual store (node_modules/.pnpm/<name>@ver).
    const pnpmStore = path.join(repoRoot, 'node_modules', '.pnpm')
    const flat = name.replace('/', '+')
    try {
      const match = fs
        .readdirSync(pnpmStore)
        .find((dir) => dir === flat || dir.startsWith(`${flat}@`))
      if (match) {
        return path.join(pnpmStore, match, 'node_modules', name)
      }
    } catch {
      // fall through
    }
    return null
  }
}

const ENTRY_SOURCE = [
  "import { createElement } from 'react'",
  "import { renderAndroidVariantToJson } from '@use-voltra/android'",
  "import { SmokeClientWidget } from '~/widgets/android/SmokeClientWidget'",
  '',
  '// Mirrors the production Metro entry (example/metro/widgetRegistry.js): props/env cross',
  '// the native boundary as JSON strings; the resolved node tree is stringified back.',
  'export function render(propsJSON, envJSON) {',
  "  const props = typeof propsJSON === 'string' ? (propsJSON ? JSON.parse(propsJSON) : {}) : (propsJSON || {})",
  "  const env = typeof envJSON === 'string' ? (envJSON ? JSON.parse(envJSON) : {}) : (envJSON || {})",
  '  const WidgetWithEnv = (forwardedProps) => SmokeClientWidget(forwardedProps, env)',
  '  const resolved = renderAndroidVariantToJson(createElement(WidgetWithEnv, props))',
  '  return JSON.stringify(resolved)',
  '}',
  '',
  'export default render',
  '',
].join('\n')

async function main() {
  const appConfig = expoGetDefaultConfig(projectRoot)
  const config = await metroGetDefaultConfig(projectRoot)

  const appNodeModules = path.join(projectRoot, 'node_modules')
  const sourceExts = unique([...config.resolver.sourceExts, ...appConfig.resolver.sourceExts])
  const pnpmTransitiveModules = Object.fromEntries(
    Object.entries({
      '@babel/runtime': resolvePnpmTransitive('@babel/runtime'),
      'metro-runtime': resolvePnpmTransitive('metro-runtime'),
    }).filter(([, value]) => value !== null)
  )

  const widgetConfig = {
    ...config,
    projectRoot,
    watchFolders: unique([
      ...(config.watchFolders || []),
      ...(appConfig.watchFolders || []),
      ...Object.values(linkedPackages),
    ]),
    resolver: {
      ...config.resolver,
      sourceExts,
      extraNodeModules: {
        ...config.resolver.extraNodeModules,
        ...appConfig.resolver.extraNodeModules,
        ...pnpmTransitiveModules,
        ...linkedPackages,
        '~': projectRoot,
        react: path.join(appNodeModules, 'react'),
      },
      nodeModulesPaths: unique([
        appNodeModules,
        ...config.resolver.nodeModulesPaths,
        ...appConfig.resolver.nodeModulesPaths,
      ]),
      resolveRequest(context, moduleName, platform) {
        if (blockedModules.has(moduleName) || moduleName.startsWith('react-native/')) {
          throw new Error(`Voltra widget bundles cannot import "${moduleName}"`)
        }
        return context.resolveRequest(context, moduleName, platform)
      },
    },
    serializer: {
      ...config.serializer,
      getModulesRunBeforeMainModule: () => [],
      getPolyfills: () => [],
      polyfillModuleNames: [],
    },
    transformer: {
      ...config.transformer,
      babelTransformerPath: appConfig.transformer.babelTransformerPath,
    },
  }

  const entryFile = path.join(projectRoot, '.voltra/metro/entries', `${WIDGET_ID}.smoke.entry.js`)
  fs.mkdirSync(path.dirname(entryFile), { recursive: true })
  fs.writeFileSync(entryFile, ENTRY_SOURCE)

  const outFile = path.join(projectRoot, 'android/app/src/main/assets/voltra/smoke-widget.bundle')
  fs.mkdirSync(path.dirname(outFile), { recursive: true })

  console.log(`[smoke] bundling ${WIDGET_ID} (platform=android, dev=true)…`)
  await Metro.runBuild(widgetConfig, {
    entry: entryFile,
    platform: 'android',
    dev: true,
    minify: false,
    out: outFile,
    sourceMap: false,
  })

  // Metro's runBuild forces a `.js` extension on the output path; normalize back to the
  // `.bundle` name the Android smoke harness reads from assets.
  const writtenFile = fs.existsSync(outFile) ? outFile : `${outFile}.js`
  if (writtenFile !== outFile) {
    fs.renameSync(writtenFile, outFile)
  }

  const bytes = fs.statSync(outFile).size
  console.log(`[smoke] wrote ${outFile} (${bytes} bytes)`)
}

main().catch((error) => {
  console.error('[smoke] bundling failed:', error)
  process.exitCode = 1
})