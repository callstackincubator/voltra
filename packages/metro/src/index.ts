import fs from 'node:fs'
import path from 'node:path'

import { createMetroConfigTransformer } from 'metro-config-transformers'

import { bundleWidgets } from './bundleWidgets'
import { createVoltraMiddleware } from './createVoltraMiddleware'
import { createWidgetMetroConfig } from './createWidgetMetroConfig'
import { requireProjectModule } from './resolveProjectModule'
import { createWidgetRegistry, ensureEmptyDevBarrel } from './widgetRegistry'

const HOT_RELOAD_ALIAS = '@use-voltra/widget-hot-reload'
const DEV_BARREL_PLATFORMS = new Set(['ios', 'android'])

type ResolveRequest = (context: any, moduleName: string, platform: string | null) => unknown

function resolveHotReloadAlias(projectRoot: string, context: any, platform: string | null): unknown {
  if (!context.dev) {
    return { type: 'empty' }
  }

  if (!platform || !DEV_BARREL_PLATFORMS.has(platform)) {
    return { type: 'sourceFile', filePath: ensureEmptyDevBarrel(projectRoot) }
  }

  const platformBarrel = path.join(projectRoot, '.voltra', 'metro', `widgets-dev-barrel.${platform}.js`)
  if (!fs.existsSync(platformBarrel)) {
    return { type: 'sourceFile', filePath: ensureEmptyDevBarrel(projectRoot) }
  }

  return { type: 'sourceFile', filePath: platformBarrel }
}

function createResolveRequest(
  projectRoot: string,
  previousResolveRequest: ResolveRequest | null | undefined
): ResolveRequest {
  return (context, moduleName, platform) => {
    if (moduleName === HOT_RELOAD_ALIAS) {
      return resolveHotReloadAlias(projectRoot, context, platform)
    }

    if (previousResolveRequest) {
      return previousResolveRequest(context, moduleName, platform)
    }

    return context.resolveRequest(context, moduleName, platform)
  }
}

export const withVoltra = createMetroConfigTransformer(async (metroConfig: any) => {
  const projectRoot = metroConfig.projectRoot ?? process.cwd()
  const registry = createWidgetRegistry({ projectRoot })
  const widgetConfig = await createWidgetMetroConfig({
    projectRoot,
    appConfig: metroConfig,
  })
  const Metro = requireProjectModule<{ createConnectMiddleware(config: any, options?: any): Promise<any> }>(
    'metro',
    projectRoot
  )
  const connect = requireProjectModule<() => { use(pathOrMiddleware: string | unknown, middleware?: unknown): any }>(
    'connect',
    projectRoot
  )
  const widgetMetro = await Metro.createConnectMiddleware(widgetConfig, {
    port: metroConfig.server?.port,
  })
  const voltraMiddleware = createVoltraMiddleware({
    registry,
    widgetMetro,
  })

  const previousEnhanceMiddleware = metroConfig.server?.enhanceMiddleware || ((middleware: unknown) => middleware)
  const previousResolveRequest = metroConfig.resolver?.resolveRequest

  return {
    ...metroConfig,
    projectRoot,
    resolver: {
      ...metroConfig.resolver,
      resolveRequest: createResolveRequest(projectRoot, previousResolveRequest),
    },
    server: {
      ...metroConfig.server,
      enhanceMiddleware(metroMiddleware: unknown, metroServer: unknown) {
        const enhancedAppMetroMiddleware = previousEnhanceMiddleware(metroMiddleware, metroServer)

        return connect().use('/voltra', voltraMiddleware).use(enhancedAppMetroMiddleware)
      },
    },
  }
})

export { bundleWidgets, createVoltraMiddleware, createWidgetMetroConfig, createWidgetRegistry }
export { requireProjectModule, resolveProjectModulePath } from './resolveProjectModule'
export { scanVoltraDirectives, type VoltraDirectiveWidget } from './scanner'
export { DuplicateVoltraWidgetError, type RegisteredVoltraWidget, type WidgetRegistry } from './widgetRegistry'
