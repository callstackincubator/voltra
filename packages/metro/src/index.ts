import fs from 'node:fs'
import path from 'node:path'

import { createMetroConfigTransformer } from 'metro-config-transformers'

import { bundleWidgets } from './bundleWidgets'
import { createVoltraMiddleware } from './createVoltraMiddleware'
import { createWidgetMetroConfig } from './createWidgetMetroConfig'
import { createLiveActivityRegistry, MissingVoltraLiveActivitiesManifestError } from './liveActivityRegistry'
import { requireProjectModule } from './resolveProjectModule'
import {
  createWidgetRegistry,
  ensureEmptyDevBarrel,
  MissingVoltraManifestError,
  type RegisteredVoltraWidget,
  type WidgetRegistry,
} from './widgetRegistry'

const HOT_RELOAD_ALIAS = '@use-voltra/widget-hot-reload'
const LIVE_ACTIVITY_HOT_RELOAD_ALIAS = '@use-voltra/live-activity-hot-reload'
const DEV_BARREL_PLATFORMS = new Set(['ios', 'android'])
const WIDGET_PLATFORMS = ['ios', 'android'] as const

type ResolveRequest = (context: any, moduleName: string, platform: string | null) => unknown

function resolveHotReloadAlias(projectRoot: string, context: any, platform: string | null): unknown {
  if (!context.dev) {
    return { type: 'empty' }
  }

  if (!platform || !DEV_BARREL_PLATFORMS.has(platform)) {
    return { type: 'sourceFile', filePath: ensureEmptyDevBarrel(projectRoot) }
  }

  const platformBarrel = path.join(projectRoot, '.voltra', 'metro', `widget-hot-reload.${platform}.js`)
  if (!fs.existsSync(platformBarrel)) {
    return { type: 'sourceFile', filePath: ensureEmptyDevBarrel(projectRoot) }
  }

  return { type: 'sourceFile', filePath: platformBarrel }
}

function resolveLiveActivityHotReloadAlias(projectRoot: string, context: any, platform: string | null): unknown {
  if (!context.dev || platform !== 'ios') return { type: 'empty' }
  const barrel = path.join(projectRoot, '.voltra', 'metro', 'live-activity-hot-reload.ios.js')
  return fs.existsSync(barrel) ? { type: 'sourceFile', filePath: barrel } : { type: 'empty' }
}

function createResolveRequest(
  projectRoot: string,
  previousResolveRequest: ResolveRequest | null | undefined
): ResolveRequest {
  return (context, moduleName, platform) => {
    if (moduleName === HOT_RELOAD_ALIAS) {
      return resolveHotReloadAlias(projectRoot, context, platform)
    }
    if (moduleName === LIVE_ACTIVITY_HOT_RELOAD_ALIAS) {
      return resolveLiveActivityHotReloadAlias(projectRoot, context, platform)
    }

    if (previousResolveRequest) {
      return previousResolveRequest(context, moduleName, platform)
    }

    return context.resolveRequest(context, moduleName, platform)
  }
}

function listConfiguredWidgets(registry: WidgetRegistry): RegisteredVoltraWidget[] {
  const widgets: RegisteredVoltraWidget[] = []

  for (const platform of WIDGET_PLATFORMS) {
    try {
      widgets.push(...registry.listWidgets(platform))
    } catch (error) {
      if (error instanceof MissingVoltraManifestError) {
        continue
      }

      throw error
    }
  }

  return widgets
}

export const withVoltra = createMetroConfigTransformer(async (metroConfig: any) => {
  const projectRoot = metroConfig.projectRoot ?? process.cwd()
  const registry = createWidgetRegistry({ projectRoot })
  const liveActivityRegistry = createLiveActivityRegistry({ projectRoot })
  const previousResolveRequest = metroConfig.resolver?.resolveRequest
  const configWithResolver = {
    ...metroConfig,
    projectRoot,
    resolver: {
      ...metroConfig.resolver,
      resolveRequest: createResolveRequest(projectRoot, previousResolveRequest),
    },
  }

  const configuredWidgets = listConfiguredWidgets(registry)
  let configuredLiveActivities = []
  try {
    configuredLiveActivities = liveActivityRegistry.listLiveActivities()
  } catch (error) {
    if (!(error instanceof MissingVoltraLiveActivitiesManifestError)) throw error
  }

  if (configuredWidgets.length === 0 && configuredLiveActivities.length === 0) {
    registry.close()
    liveActivityRegistry.close()
    return configWithResolver
  }

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
    liveActivityRegistry,
    widgetMetro,
  })

  const previousEnhanceMiddleware = metroConfig.server?.enhanceMiddleware || ((middleware: unknown) => middleware)

  return {
    ...configWithResolver,
    server: {
      ...metroConfig.server,
      enhanceMiddleware(metroMiddleware: unknown, metroServer: unknown) {
        const enhancedAppMetroMiddleware = previousEnhanceMiddleware(metroMiddleware, metroServer)

        return connect().use('/voltra', voltraMiddleware).use(enhancedAppMetroMiddleware)
      },
    },
  }
})

export {
  bundleWidgets,
  createVoltraMiddleware,
  createWidgetMetroConfig,
  createWidgetRegistry,
  createLiveActivityRegistry,
}
export { requireProjectModule, resolveProjectModulePath } from './resolveProjectModule'
export { scanVoltraDirectives, type VoltraDirectiveWidget } from './scanner'
export { DuplicateVoltraWidgetError, type RegisteredVoltraWidget, type WidgetRegistry } from './widgetRegistry'
export {
  DuplicateVoltraLiveActivityError,
  InvalidVoltraLiveActivitiesManifestError,
  MissingVoltraLiveActivitiesManifestError,
  type LiveActivityRegistry,
  type RegisteredVoltraLiveActivity,
} from './liveActivityRegistry'
