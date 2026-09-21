import { createRequire } from 'node:module'
import path from 'node:path'

import {
  describeBlockedWidgetImport,
  isReactNativeImport,
  resolveWidgetImport,
  WIDGET_REACT_NATIVE_SHIM_PACKAGE,
  type WidgetModulePlatform,
} from '@use-voltra/compiler'

import { requireProjectModule, resolveProjectModulePath } from './resolveProjectModule'
import { createErrorOnlyMetroReporter } from './createErrorOnlyMetroReporter'

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

/**
 * Locate a `@use-voltra/compiler` entry point from this package's own installation.
 *
 * The shim it hosts is a transitive dependency of the app, so it cannot be resolved from
 * the project root; going through `@use-voltra/metro` — which the app does depend on —
 * finds the copy that pairs with this bundler.
 */
function resolveWidgetShim(specifier: string, projectRoot: string): string {
  const metroPackagePath = resolveProjectModulePath('@use-voltra/metro/package.json', projectRoot)
  return createRequire(metroPackagePath).resolve(specifier)
}

function asWidgetModulePlatform(platform: string | null): WidgetModulePlatform | null {
  return platform === 'ios' || platform === 'android' ? platform : null
}

/** Report each redirect once per bundler config, matching what the build-time loaders log. */
function createWarnOnce(): (message: string) => void {
  const seen = new Set<string>()

  return (message: string) => {
    if (seen.has(message)) {
      return
    }

    seen.add(message)
    console.warn(`[voltra] ${message}`)
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
  const warnOnce = createWarnOnce()

  return {
    ...config,
    projectRoot,
    watchFolders: unique([projectRoot, ...(config.watchFolders ?? []), ...(appConfig.watchFolders ?? [])]),
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
      resolveRequest(context: any, moduleName: string, requestedPlatform: string | null) {
        // The same import policy the CLI and the Expo plugins apply when they evaluate
        // widget source at build time, so a widget that prerenders also bundles.
        const widgetPlatform = asWidgetModulePlatform(requestedPlatform)

        if (!widgetPlatform) {
          // Without a target platform there is no honest `Platform.OS` to serve.
          if (isReactNativeImport(moduleName)) {
            throw new Error(describeBlockedWidgetImport(moduleName))
          }

          return context.resolveRequest(context, moduleName, requestedPlatform)
        }

        const resolution = resolveWidgetImport(moduleName, widgetPlatform)

        if (resolution.kind === 'blocked') {
          throw new Error(resolution.reason)
        }

        if (resolution.kind === 'passthrough') {
          return context.resolveRequest(context, moduleName, requestedPlatform)
        }

        if (resolution.warning) {
          warnOnce(resolution.warning)
        }

        if (resolution.specifier.startsWith(`${WIDGET_REACT_NATIVE_SHIM_PACKAGE}/`)) {
          return { type: 'sourceFile', filePath: resolveWidgetShim(resolution.specifier, projectRoot) }
        }

        return context.resolveRequest(context, resolution.specifier, requestedPlatform)
      },
    },
    serializer: {
      ...config.serializer,
      getModulesRunBeforeMainModule: () => [],
      getPolyfills: () => [],
      polyfillModuleNames: [],
    },
    reporter: createErrorOnlyMetroReporter(),
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
