const path = require('node:path')

const { getDefaultConfig } = require('metro-config')

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

async function createWidgetMetroConfig({ projectRoot, appConfig }) {
  const repoRoot = path.resolve(projectRoot, '..')
  const appNodeModules = path.join(projectRoot, 'node_modules')
  const linkedPackages = createLinkedPackages(repoRoot)
  const config = await getDefaultConfig(projectRoot)
  const sourceExts = unique([...config.resolver.sourceExts, ...appConfig.resolver.sourceExts])

  return {
    ...config,
    projectRoot,
    watchFolders: unique([...config.watchFolders, ...appConfig.watchFolders, ...Object.values(linkedPackages)]),
    resolver: {
      ...config.resolver,
      sourceExts,
      extraNodeModules: {
        ...config.resolver.extraNodeModules,
        ...linkedPackages,
        '~': projectRoot,
        react: path.join(appNodeModules, 'react'),
      },
      nodeModulesPaths: unique([appNodeModules, ...config.resolver.nodeModulesPaths]),
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
