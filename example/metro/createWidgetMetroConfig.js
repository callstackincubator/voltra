const path = require('node:path')

const { requireProjectModule, resolveProjectModulePath } = require('./resolveProjectModule')

const blockedModules = new Set(['react-native'])

function createLinkedPackages(repoRoot) {
  return {
    '@use-voltra/android': path.join(repoRoot, 'packages/android'),
    '@use-voltra/android-client': path.join(repoRoot, 'packages/android-client'),
    '@use-voltra/core': path.join(repoRoot, 'packages/core'),
    '@use-voltra/expo-plugin': path.join(repoRoot, 'packages/expo-plugin'),
    '@use-voltra/ios': path.join(repoRoot, 'packages/ios'),
    '@use-voltra/ios-client': path.join(repoRoot, 'packages/ios-client'),
    '@use-voltra/server': path.join(repoRoot, 'packages/server'),
  }
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)))
}

function resolvePnpmTransitive(name, projectRoot) {
  // pnpm's strict node_modules layout doesn't expose transitive dependencies to the
  // widget entry file in `.voltra/metro/entries/` because that path isn't inside any
  // package's pnpm-managed `node_modules`. Resolve them explicitly so Babel-emitted
  // runtime helpers and Metro's async-require shim bundle cleanly. resolveProjectModulePath
  // works both inside the Expo/Metro CLI (dev) and in the standalone release bundler.
  try {
    return path.dirname(resolveProjectModulePath(`${name}/package.json`, projectRoot))
  } catch {
    return null
  }
}

async function createWidgetMetroConfig({ projectRoot, appConfig }) {
  const repoRoot = path.resolve(projectRoot, '..')
  const appNodeModules = path.join(projectRoot, 'node_modules')
  const linkedPackages = createLinkedPackages(repoRoot)
  const { getDefaultConfig } = requireProjectModule('metro-config', projectRoot)
  const config = await getDefaultConfig(projectRoot)
  const sourceExts = unique([...config.resolver.sourceExts, ...appConfig.resolver.sourceExts])
  const pnpmTransitives = {
    '@babel/runtime': resolvePnpmTransitive('@babel/runtime', projectRoot),
    'metro-runtime': resolvePnpmTransitive('metro-runtime', projectRoot),
  }
  const pnpmTransitiveModules = Object.fromEntries(
    Object.entries(pnpmTransitives).filter(([, value]) => value !== null)
  )

  return {
    ...config,
    projectRoot,
    watchFolders: unique([...config.watchFolders, ...appConfig.watchFolders, ...Object.values(linkedPackages)]),
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
    server: {
      ...config.server,
      enhanceMiddleware: (middleware) => middleware,
    },
  }
}

module.exports = { createWidgetMetroConfig }
