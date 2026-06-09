const connect = require('connect')
const Metro = require('metro')
const { getDefaultConfig } = require('expo/metro-config')

const { createVoltraMiddleware } = require('./createVoltraMiddleware')
const { createWidgetMetroConfig } = require('./createWidgetMetroConfig')
const { createWidgetRegistry } = require('./widgetRegistry')

async function createMetroConfig(projectRoot) {
  const appConfig = getDefaultConfig(projectRoot)
  appConfig.resolver.extraNodeModules = {
    ...appConfig.resolver.extraNodeModules,
    '~': projectRoot,
  }

  const registry = createWidgetRegistry({ projectRoot })

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
