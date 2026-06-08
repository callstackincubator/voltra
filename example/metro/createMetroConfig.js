const fs = require('node:fs')
const path = require('node:path')

const connect = require('connect')
const Metro = require('metro')
const { getDefaultConfig } = require('expo/metro-config')

const { createDevPusher } = require('./voltraDevPush')
const { createVoltraMiddleware } = require('./createVoltraMiddleware')
const { createWidgetMetroConfig } = require('./createWidgetMetroConfig')
const { createWidgetRegistry } = require('./widgetRegistry')

/**
 * Read the host app's bundle identifier and the `clientWidgetHotReload` flag from
 * `app.json`. Returns nulls (and the caller skips push wiring) if either is missing.
 */
function readVoltraDevConfig(projectRoot) {
  const appJsonPath = path.join(projectRoot, 'app.json')
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))
    const bundleId = appJson?.expo?.ios?.bundleIdentifier ?? null
    const plugins = appJson?.expo?.plugins ?? []
    let hotReloadFlag = false
    for (const entry of plugins) {
      if (Array.isArray(entry) && entry[0] === '@use-voltra/ios-client') {
        hotReloadFlag = entry[1]?.clientWidgetHotReload === true
        break
      }
    }
    return { bundleId, hotReloadFlag }
  } catch {
    return { bundleId: null, hotReloadFlag: false }
  }
}

async function createMetroConfig(projectRoot) {
  const appConfig = getDefaultConfig(projectRoot)
  appConfig.resolver.extraNodeModules = {
    ...appConfig.resolver.extraNodeModules,
    '~': projectRoot,
  }

  // Dev-mode push reload wiring. When clientWidgetHotReload is on in app.json's
  // @use-voltra/ios-client plugin config, fire `xcrun simctl push` whenever a
  // 'use voltra' file gets modified so the host app's VoltraDevReloadHandler calls
  // WidgetCenter.shared.reloadAllTimelines(). The pusher silently no-ops if Metro is
  // running outside the simulator dev loop.
  const { bundleId, hotReloadFlag } = readVoltraDevConfig(projectRoot)
  const devPusher = hotReloadFlag && bundleId ? createDevPusher({ bundleId }) : null

  const registry = createWidgetRegistry({
    projectRoot,
    onWidgetSourceChanged: devPusher ? () => devPusher.fire() : undefined,
  })

  const widgetConfig = await createWidgetMetroConfig({
    projectRoot,
    registry,
    appConfig,
  })
  const widgetMetro = await Metro.createConnectMiddleware(widgetConfig, {
    port: appConfig.server.port,
  })
  const voltraMiddleware = createVoltraMiddleware({
    registry,
    widgetMetro,
  })

  const previousHook = appConfig.serializer.experimentalSerializerHook
  appConfig.serializer.experimentalSerializerHook = (graph, delta) => {
    if (previousHook) {
      previousHook(graph, delta)
    }

    registry.applyMetroDelta(delta)
  }

  const previousEnhanceMiddleware = appConfig.server.enhanceMiddleware || ((middleware) => middleware)
  appConfig.server.enhanceMiddleware = (metroMiddleware, metroServer) => {
    const enhancedAppMetroMiddleware = previousEnhanceMiddleware(metroMiddleware, metroServer)

    return connect().use('/voltra', voltraMiddleware).use(enhancedAppMetroMiddleware)
  }

  return appConfig
}

module.exports = { createMetroConfig }
