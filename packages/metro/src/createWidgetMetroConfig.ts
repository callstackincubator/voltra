import path from 'node:path'

import { requireProjectModule, resolveProjectModulePath } from './resolveProjectModule'

const blockedModules = new Set(['react-native'])

function unique<T>(items: Array<T | null | undefined>): T[] {
  return Array.from(new Set(items.filter((item): item is T => item !== null && item !== undefined)))
}

function resolvePnpmTransitive(name: string, projectRoot: string): string | null {
  try {
    return path.dirname(resolveProjectModulePath(`${name}/package.json`, projectRoot))
  } catch {
    return null
  }
}

export async function createWidgetMetroConfig({
  projectRoot,
  appConfig,
}: {
  projectRoot: string
  appConfig: any
}): Promise<any> {
  const appNodeModules = path.join(projectRoot, 'node_modules')
  const { getDefaultConfig } = requireProjectModule<{ getDefaultConfig(rootPath: string): Promise<any> }>(
    'metro-config',
    projectRoot
  )
  const config = await getDefaultConfig(projectRoot)
  const sourceExts = unique([...(config.resolver?.sourceExts ?? []), ...(appConfig.resolver?.sourceExts ?? [])])
  const pnpmTransitives = {
    '@babel/runtime': resolvePnpmTransitive('@babel/runtime', projectRoot),
    'metro-runtime': resolvePnpmTransitive('metro-runtime', projectRoot),
  }
  const pnpmTransitiveModules = Object.fromEntries(
    Object.entries(pnpmTransitives).filter((entry): entry is [string, string] => entry[1] !== null)
  )

  return {
    ...config,
    projectRoot,
    watchFolders: unique([...(config.watchFolders ?? []), ...(appConfig.watchFolders ?? [])]),
    resolver: {
      ...config.resolver,
      sourceExts,
      extraNodeModules: {
        ...config.resolver?.extraNodeModules,
        ...appConfig.resolver?.extraNodeModules,
        ...pnpmTransitiveModules,
        react: path.join(appNodeModules, 'react'),
      },
      nodeModulesPaths: unique([
        appNodeModules,
        ...(config.resolver?.nodeModulesPaths ?? []),
        ...(appConfig.resolver?.nodeModulesPaths ?? []),
      ]),
      resolveRequest(context: any, moduleName: string, platform: string | null) {
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
      babelTransformerPath: appConfig.transformer?.babelTransformerPath,
    },
    server: {
      ...config.server,
      enhanceMiddleware: (middleware: unknown) => middleware,
    },
  }
}
