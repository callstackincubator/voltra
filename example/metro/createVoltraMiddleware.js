function sendJson(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(value, null, 2))
}

function createBundleRequest(widget, originalSearchParams) {
  const query = new URLSearchParams(originalSearchParams)
  query.set('bundleEntry', widget.generatedEntryRelativePath)

  if (!query.has('platform')) {
    query.set('platform', 'voltra')
  }

  return `/voltra-widget.bundle?${query.toString()}`
}

function createVoltraMiddleware({ registry, widgetMetro }) {
  return (req, res, next) => {
    const requestUrl = new URL(req.url, 'http://localhost')
    const pathname = requestUrl.pathname || '/'

    if (pathname === '/' || pathname === '/widgets') {
      sendJson(res, 200, {
        ready: registry.isReady(),
        widgets: registry.listWidgets(),
      })
      return
    }

    const widgetBundleMatch = pathname.match(/^\/widgets\/([^/]+)\.bundle$/)
    if (widgetBundleMatch) {
      const widgetId = decodeURIComponent(widgetBundleMatch[1])
      const widget = registry.getWidget(widgetId)

      if (!widget) {
        sendJson(res, registry.isReady() ? 404 : 425, {
          error: registry.isReady()
            ? `Unknown Voltra widget "${widgetId}".`
            : 'Voltra widget registry is not ready yet. Build the app bundle first.',
        })
        return
      }

      req.url = createBundleRequest(widget, requestUrl.searchParams)
      widgetMetro.middleware(req, res, next)
      return
    }

    sendJson(res, 404, {
      error: `Unknown Voltra endpoint "${pathname}".`,
    })
  }
}

module.exports = { createVoltraMiddleware }
